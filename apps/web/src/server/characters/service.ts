import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "../db/supabase";
import { BusinessError } from "../api/http";
import { readConfig } from "../config";
import { createCharacterDescriber, createClaudeAdjuster } from "../claude/client";
import type { CharacterDescriber, PromptAdjuster } from "../claude/types";
import { failGeneration, generationDeps, getGeneration, submitGeneration, type GenerationDeps, type GenerationInput } from "../higgsfield/process";
import { assertProviderAvailable } from "../higgsfield/provider-health";
import { loadPrompt, render } from "../prompts";
import { appendShortcutLines, redoRequest, type RedoInput } from "../prompts/redo-shortcuts";
import { claudeImage, signBrandPaths } from "../storage";
import { track } from "../analytics/track";
import { PHOTO_BUCKET } from "@/lib/storage-paths";

/**
 * Catálogo de personagens da marca (emenda MD-17, plans/I-2-personagens.md): criar, fotos de
 * referência, ficha de personagem (2 créditos; refazer 1), aprovar, arquivar e listar.
 */

/** Quem pede: usuário da marca (só a própria) ou admin (qualquer) — seção 13. */
export type CharacterActor = { id: string; papel: "admin_plataforma" | "usuario_marca"; marcaId: string | null; email?: string };

const GENEROS = ["mulher", "homem"] as const;
const FAIXAS = ["de_20_a_30", "de_30_a_45", "acima_de_45"] as const;

/** Corpo de `POST /api/personagens`. Marca do admin vem no corpo; a do lojista, do perfil. */
export const createCharacterSchema = z
  .object({
    nome: z.string().trim().min(1).max(60),
    descricao: z.string().trim().max(300).optional(),
    genero_modelo: z.enum(GENEROS),
    faixa_etaria: z.enum(FAIXAS),
    marca_id: z.string().uuid().optional(),
  })
  .strict();

let testDescriber: CharacterDescriber | null = null;
let testAdjuster: PromptAdjuster | null = null;
/** Troca os clientes do Claude nos testes de integração (nunca usado fora de testes). */
export function setCharacterAiForTests(describer: CharacterDescriber | null, adjuster: PromptAdjuster | null = null): void {
  testDescriber = describer;
  testAdjuster = adjuster;
}

function assertOwner(actor: CharacterActor, marcaId: string): void {
  if (actor.papel !== "admin_plataforma" && actor.marcaId !== marcaId) throw new BusinessError("personagem_inexistente");
}

const FAIXA_EN: Record<string, string> = { de_20_a_30: "in their 20s", de_30_a_45: "in their 30s to mid 40s", acima_de_45: "over 45" };

/**
 * Cria a personagem (ainda sem ficha). Recebe: ator e dados validados. Devolve: { personagemId }.
 * Marca pausada não cria (mesma regra das ações da marca).
 */
export async function createCharacter(actor: CharacterActor, input: z.infer<typeof createCharacterSchema>): Promise<{ personagemId: string }> {
  const marcaId = actor.papel === "admin_plataforma" ? input.marca_id : actor.marcaId;
  if (!marcaId) throw new BusinessError("validacao");
  const db = createAdminClient();
  const { data: marca } = await db.from("marcas").select("ativa").eq("id", marcaId).maybeSingle();
  if (!marca) throw new BusinessError("marca_inexistente");
  if (!marca.ativa) throw new BusinessError("marca_inativa");
  const { data, error } = await db
    .from("personagens")
    .insert({ marca_id: marcaId, nome: input.nome, descricao: input.descricao || null, genero_modelo: input.genero_modelo, faixa_etaria: input.faixa_etaria, criado_por: actor.id })
    .select("id")
    .single();
  if (error) throw error;
  await track({ nome: "adfit_personagem_criada", distinctId: actor.email ?? "", tela: "Personagens", descricao: "criou uma personagem no catálogo", propriedades: { personagem_id: data.id } });
  return { personagemId: data.id };
}

/**
 * Registra fotos de referência já enviadas ao Storage (o cliente envia direto, política de
 * Storage `pode_gravar_foto_personagem`). Só aceita caminhos da pasta da personagem; até 4 (trigger).
 * Recebe: ator, personagem e caminhos completos (`produtos/<marca>/personagens/<id>/originais/…`).
 */
export async function addCharacterPhotos(actor: CharacterActor, personagemId: string, paths: string[]): Promise<void> {
  const db = createAdminClient();
  const { data: p } = await db.from("personagens").select("id, marca_id, arquivado").eq("id", personagemId).maybeSingle();
  if (!p || p.arquivado) throw new BusinessError("personagem_inexistente");
  assertOwner(actor, p.marca_id);
  const prefix = `${PHOTO_BUCKET}/${p.marca_id}/personagens/${p.id}/originais/`;
  if (!paths.length || paths.some((x) => !x.startsWith(prefix) || x.includes("..") || x.slice(prefix.length).includes("/"))) throw new BusinessError("validacao");
  const { count } = await db.from("fotos_personagem").select("id", { count: "exact", head: true }).eq("personagem_id", p.id);
  const rows = paths.map((storage_path, i) => ({ personagem_id: p.id, marca_id: p.marca_id, storage_path, ordem: Math.min(4, (count ?? 0) + i + 1) }));
  const { error } = await db.from("fotos_personagem").insert(rows);
  if (error) throw error.message === "limite_fotos" ? new BusinessError("limite_fotos") : error;
  await db.from("personagens").update({ origem: "fotos" }).eq("id", p.id).eq("origem", "descricao");
}

type CharacterSheetRow = { id: string; versao: number; status: string; imagem_path: string | null; geracao_id: string | null };

/** Prompt da ficha de personagem (personagem.v1) montado pelo código. */
export function buildCharacterSheetPrompt(input: { modeloEn: string; genero: string; faixa: string; comReferencias: boolean; instrucaoEn?: string }): { prompt: string; versao: string } {
  const { versao, texto } = loadPrompt("personagem");
  const quem = `${input.genero === "homem" ? "a man" : "a woman"} ${FAIXA_EN[input.faixa] ?? ""}`.trim();
  const prompt = render(texto, {
    quem,
    modelo_en: input.modeloEn,
    referencia_fotos: input.comReferencias ? "The reference images show the real person: keep the exact same face, skin tone, hair and body; ignore their clothes and background." : "",
    instrucao_refacao_en: input.instrucaoEn ?? "",
  });
  return { prompt, versao };
}

/**
 * POST /api/personagens/:id/ficha — ficha de personagem (MD-17). Mesmo ciclo da ficha da peça
 * (8.4): uma `gerando` por vez (índice único), saldo da Higgsfield conferido e débito ANTES
 * (`gerar_ficha_personagem` = 2; `refazer_ficha_personagem` = 1 quando já há versão com imagem),
 * geração `na_fila` antes do Claude (órfã → varredura estorna), descrição em inglês pelo Claude na
 * 1ª versão (texto + fotos), refação com atalhos e `refacao.v2`, submissão. Referências: fotos da
 * personagem ou, se veio de um anúncio, as imagens atuais das cenas dele.
 * Recebe: ator, personagem e instrução opcional. Devolve: { fichaId }.
 */
export async function requestCharacterSheet(
  actor: CharacterActor,
  personagemId: string,
  instrucao: RedoInput,
  deps: { generation?: GenerationDeps; describer?: CharacterDescriber; adjuster?: PromptAdjuster } = {},
): Promise<{ fichaId: string }> {
  const db = createAdminClient();
  const { data: p } = await db
    .from("personagens")
    .select("id, marca_id, nome, descricao, modelo_en, genero_modelo, faixa_etaria, origem, anuncio_origem_id, arquivado, fotos_personagem(storage_path, ordem), fichas_personagem!fichas_personagem_personagem_id_marca_id_fkey(id, versao, status, imagem_path, geracao_id)")
    .eq("id", personagemId)
    .maybeSingle();
  if (!p || p.arquivado) throw new BusinessError("personagem_inexistente");
  assertOwner(actor, p.marca_id);
  const fichas = (p.fichas_personagem ?? []) as CharacterSheetRow[];
  if (fichas.some((f) => f.status === "gerando")) throw new BusinessError("ficha_em_geracao");

  // Referências: fotos da personagem; ou, se veio de um anúncio, as imagens atuais das cenas.
  let referencias = [...((p.fotos_personagem ?? []) as Array<{ storage_path: string; ordem: number }>)].sort((a, b) => a.ordem - b.ordem).map((f) => f.storage_path);
  if (!referencias.length && p.anuncio_origem_id) {
    const { data: cenas } = await db.from("cenas").select("ordem, quadros!cenas_quadro_atual_id_fkey(imagem_path)").eq("anuncio_id", p.anuncio_origem_id).order("ordem");
    referencias = (cenas ?? []).flatMap((c) => ((c.quadros as unknown as { imagem_path: string | null } | null)?.imagem_path ? [(c.quadros as unknown as { imagem_path: string }).imagem_path] : []));
  }

  const isRedo = fichas.some((f) => f.imagem_path);
  const versao = Math.max(0, ...fichas.map((f) => f.versao)) + 1;
  const redo = isRedo ? redoRequest("ficha", instrucao) : { pedido: "", linhas: [] as string[], registro: "" };
  const fichaId = randomUUID();

  // 1. Saldo da Higgsfield e débito antes de tudo (11.2.1; pedido de 01/11/2026).
  await assertProviderAvailable();
  const { data: cobrancaId, error: debitErr } = await db.rpc("debitar_creditos", {
    p_marca_id: p.marca_id,
    p_acao: isRedo ? "refazer_ficha_personagem" : "gerar_ficha_personagem",
    p_quantidade_itens: 1,
    p_referencia_tipo: "personagem",
    p_referencia_id: p.id,
    p_criado_por: actor.id,
  });
  if (debitErr) throw debitErr;
  const refund = async (obs: string) => {
    if (!cobrancaId) return;
    const { error } = await db.rpc("estornar_creditos", { p_movimentacao_id: cobrancaId, p_observacao: obs });
    if (error && error.message !== "ja_estornado") throw error;
  };

  // 2. A versão `gerando` (o índice único recusa o 2º clique simultâneo → estorno).
  const { error: insErr } = await db
    .from("fichas_personagem")
    .insert({ id: fichaId, personagem_id: p.id, marca_id: p.marca_id, versao, status: "gerando", instrucao_refacao: redo.registro || null });
  if (insErr) {
    await refund("Pedido repetido: já havia uma ficha de personagem em preparo");
    throw insErr.code === "23505" ? new BusinessError("ficha_em_geracao") : insErr;
  }

  // 3. Geração `na_fila` antes do Claude (órfã → varredura estorna).
  const { modelo_personagem } = await readConfig(["modelo_personagem"]);
  const entrada: GenerationInput = { prompt: "", prompt_base: "", prompt_versao: loadPrompt("personagem").versao, referencias, aspect_ratio: "16:9", resumo_refacao: null };
  const { data: geracao, error: genErr } = await db
    .from("geracoes")
    .insert({ marca_id: p.marca_id, tipo: "ficha_personagem", modelo: String(modelo_personagem), entrada: entrada as never, cobranca_id: cobrancaId })
    .select("id")
    .single();
  if (genErr || !geracao) {
    await db.from("fichas_personagem").update({ status: "falhou" }).eq("id", fichaId).eq("status", "gerando");
    await refund(`Falha técnica na personagem (versão ${versao})`);
    return { fichaId };
  }
  await db.from("fichas_personagem").update({ geracao_id: geracao.id }).eq("id", fichaId);

  const generation = deps.generation ?? generationDeps();
  try {
    // 4. Descrição em inglês (1ª vez ou se ainda não houver) e prompt da ficha.
    let modeloEn = p.modelo_en;
    if (!modeloEn) {
      const describer = deps.describer ?? testDescriber ?? createCharacterDescriber();
      const fotos = await Promise.all(referencias.slice(0, 4).map((r) => claudeImage(p.marca_id, r)));
      const out = await describer.describeCharacter({
        system: loadPrompt("personagemDescricao").texto,
        fotos,
        dados: { nome: p.nome, descricao_do_lojista: p.descricao ?? "", genero: p.genero_modelo, faixa_etaria: p.faixa_etaria },
      });
      modeloEn = out.modelo_en;
      await db.from("personagens").update({ modelo_en: modeloEn }).eq("id", p.id);
    }
    let instrucaoEn: string | undefined;
    if (isRedo) {
      const adjuster = deps.adjuster ?? testAdjuster ?? createClaudeAdjuster();
      const adjusted = await adjuster.adjustPrompt({ tipo: "ficha", promptAtual: `Character sheet. Appearance: ${modeloEn}`, pedido: redo.pedido });
      instrucaoEn = appendShortcutLines(`Changes requested: ${adjusted.prompt.replace(/^Character sheet\. Appearance:.*$/m, "").trim()}`, redo.linhas);
      entrada.resumo_refacao = adjusted.resumo_pt;
    }
    const built = buildCharacterSheetPrompt({ modeloEn, genero: p.genero_modelo, faixa: p.faixa_etaria, comReferencias: referencias.length > 0, instrucaoEn });
    Object.assign(entrada, { prompt: built.prompt, prompt_base: modeloEn, prompt_versao: built.versao });
    const { error } = await db.from("geracoes").update({ entrada: entrada as never }).eq("id", geracao.id);
    if (error) throw error;
  } catch (e) {
    console.error("Personagem: falha técnica antes da submissão:", e instanceof Error ? e.message : e);
    const g = await getGeneration(geracao.id);
    if (g) await failGeneration(g, "falhou", `preparo: ${e instanceof Error ? e.message : String(e)}`, generation);
    return { fichaId };
  }

  // 5. Submissão (erro segue a política comum de retentativa/estorno).
  await submitGeneration(geracao.id, generation);
  await track({ nome: "adfit_personagem_ficha_solicitada", distinctId: actor.email ?? "", tela: "Personagem", descricao: isRedo ? "pediu para refazer a ficha da personagem" : "pediu a ficha da personagem", propriedades: { personagem_id: p.id, refacao: isRedo, versao } });
  return { fichaId };
}

/** POST /api/fichas-personagem/:id/aprovar — aprova a versão (atômica). Devolve: { personagemId }. */
export async function approveCharacterSheet(actor: CharacterActor, fichaId: string): Promise<{ personagemId: string }> {
  const db = createAdminClient();
  const { data: f } = await db.from("fichas_personagem").select("id, marca_id").eq("id", fichaId).maybeSingle();
  if (!f) throw new BusinessError("ficha_inexistente");
  assertOwner(actor, f.marca_id);
  const { data, error } = await db.rpc("aprovar_ficha_personagem", { p_ficha_id: fichaId });
  if (error) throw error;
  await track({ nome: "adfit_personagem_aprovada", distinctId: actor.email ?? "", tela: "Personagem", descricao: "aprovou a ficha da personagem", propriedades: { personagem_id: String(data) } });
  return { personagemId: data as string };
}

/** Estado das versões da ficha de personagem (polling da tela; sem prompt nem custo). */
export async function characterSheetStatus(actor: CharacterActor, personagemId: string) {
  const db = createAdminClient();
  const { data: p } = await db.from("personagens").select("id, marca_id, ficha_aprovada_id").eq("id", personagemId).maybeSingle();
  if (!p) throw new BusinessError("personagem_inexistente");
  assertOwner(actor, p.marca_id);
  const { data: fichas } = await db.from("fichas_personagem").select("id, versao, status, geracao_id").eq("personagem_id", personagemId).order("versao");
  return {
    fichaAprovadaId: p.ficha_aprovada_id,
    versoes: (fichas ?? []).map((f) => ({ id: f.id, versao: f.versao, status: f.status })),
    geracoesEmAndamento: (fichas ?? []).filter((f) => f.status === "gerando" && f.geracao_id).map((f) => f.geracao_id as string),
  };
}

/** PATCH /api/personagens/:id { arquivado: true } — some do catálogo; anúncios antigos seguem. */
export async function archiveCharacter(actor: CharacterActor, personagemId: string): Promise<void> {
  const db = createAdminClient();
  const { data: p } = await db.from("personagens").select("id, marca_id, arquivado").eq("id", personagemId).maybeSingle();
  if (!p || p.arquivado) throw new BusinessError("personagem_inexistente");
  assertOwner(actor, p.marca_id);
  const { count } = await db.from("fichas_personagem").select("id", { count: "exact", head: true }).eq("personagem_id", p.id).eq("status", "gerando");
  if (count) throw new BusinessError("transicao_invalida");
  await db.from("personagens").update({ arquivado: true }).eq("id", p.id);
}

/**
 * Catálogo da marca (tela Personagens e Novo anúncio): não arquivadas, mais recentes primeiro, com
 * URL assinada da ficha aprovada (ou da última com imagem). `soProntas` = só com ficha aprovada.
 */
export async function listCharacters(marcaId: string, opts: { soProntas?: boolean } = {}) {
  const db = createAdminClient();
  let q = db
    .from("personagens")
    .select("id, nome, descricao, genero_modelo, faixa_etaria, ficha_aprovada_id, criado_em, fichas_personagem!fichas_personagem_personagem_id_marca_id_fkey(id, versao, status, imagem_path)")
    .eq("marca_id", marcaId)
    .eq("arquivado", false)
    .order("criado_em", { ascending: false });
  if (opts.soProntas) q = q.not("ficha_aprovada_id", "is", null);
  const { data } = await q;
  const rows = (data ?? []).map((c) => {
    const fichas = (c.fichas_personagem ?? []) as Array<{ id: string; versao: number; status: string; imagem_path: string | null }>;
    const aprovada = fichas.find((f) => f.id === c.ficha_aprovada_id);
    const ultima = [...fichas].filter((f) => f.imagem_path).sort((a, b) => b.versao - a.versao)[0];
    const gerando = fichas.some((f) => f.status === "gerando");
    return { id: c.id, nome: c.nome, descricao: c.descricao, genero: c.genero_modelo, faixa: c.faixa_etaria, pronta: !!c.ficha_aprovada_id, gerando, imagemPath: (aprovada ?? ultima)?.imagem_path ?? null };
  });
  const urls = await signBrandPaths(marcaId, rows.flatMap((r) => (r.imagemPath ? [r.imagemPath] : [])));
  return rows.map((r) => ({ ...r, imagem: r.imagemPath ? (urls[r.imagemPath] ?? null) : null }));
}

/** Tela da personagem: dados, fotos e versões da ficha com URL assinada. Recebe: ator e id. */
export async function getCharacterView(actor: CharacterActor, personagemId: string) {
  const db = createAdminClient();
  const { data: p } = await db
    .from("personagens")
    .select("id, marca_id, nome, descricao, genero_modelo, faixa_etaria, origem, ficha_aprovada_id, arquivado, criado_em, fotos_personagem(id, storage_path, ordem), fichas_personagem!fichas_personagem_personagem_id_marca_id_fkey(id, versao, status, imagem_path)")
    .eq("id", personagemId)
    .maybeSingle();
  if (!p || p.arquivado) throw new BusinessError("personagem_inexistente");
  assertOwner(actor, p.marca_id);
  const fotos = [...((p.fotos_personagem ?? []) as Array<{ id: string; storage_path: string; ordem: number }>)].sort((a, b) => a.ordem - b.ordem);
  const fichas = [...((p.fichas_personagem ?? []) as Array<{ id: string; versao: number; status: string; imagem_path: string | null }>)].sort((a, b) => a.versao - b.versao);
  const urls = await signBrandPaths(p.marca_id, [...fotos.map((f) => f.storage_path), ...fichas.flatMap((f) => (f.imagem_path ? [f.imagem_path] : []))]);
  const { data: ads } = await db.from("anuncios").select("id, titulo, status, criado_em").eq("personagem_id", p.id).eq("arquivado", false).order("criado_em", { ascending: false }).limit(20);
  return {
    id: p.id,
    marcaId: p.marca_id,
    nome: p.nome,
    descricao: p.descricao,
    genero: p.genero_modelo,
    faixa: p.faixa_etaria,
    origem: p.origem,
    fotos: fotos.map((f) => ({ id: f.id, url: urls[f.storage_path] ?? null })),
    versoes: fichas.map((f) => ({ id: f.id, versao: f.versao, status: f.status as "gerando" | "aguardando_aprovacao" | "aprovada" | "descartada" | "falhou", url: f.imagem_path ? (urls[f.imagem_path] ?? null) : null })),
    anuncios: ads ?? [],
  };
}

/**
 * Personagem do catálogo de um anúncio (MD-17): descrição em inglês e caminho da ficha aprovada
 * (na pasta da marca). Recebe: personagem (ou null) e marca. Devolve: dados ou null.
 */
export async function characterForAd(personagemId: string | null, marcaId: string): Promise<{ modeloEn: string; fichaPath: string } | null> {
  if (!personagemId) return null;
  const { data } = await createAdminClient()
    .from("personagens")
    .select("marca_id, modelo_en, fichas_personagem!personagens_ficha_aprovada_fk(imagem_path)")
    .eq("id", personagemId)
    .maybeSingle();
  const fichaPath = (data?.fichas_personagem as unknown as { imagem_path: string | null } | null)?.imagem_path;
  if (!data || data.marca_id !== marcaId || !data.modelo_en || !fichaPath || !fichaPath.startsWith(`produtos/${marcaId}/`)) return null;
  return { modeloEn: data.modelo_en, fichaPath };
}

/**
 * POST /api/anuncios/:id/salvar-personagem (MD-17): a modelo que ficou boa num anúncio vira
 * personagem do catálogo — descrição = `modelo` do roteiro; referências = imagens atuais das 3
 * cenas; gera a ficha (2 créditos). Só anúncio sem personagem do catálogo, com as imagens prontas.
 * Recebe: ator, anúncio e nome. Devolve: { personagemId, fichaId }.
 */
export async function saveAdModelAsCharacter(
  actor: CharacterActor,
  anuncioId: string,
  nome: string,
  deps: { generation?: GenerationDeps; describer?: CharacterDescriber } = {},
): Promise<{ personagemId: string; fichaId: string }> {
  const db = createAdminClient();
  const { data: ad } = await db.from("anuncios").select("id, marca_id, status, roteiro, genero_modelo, faixa_etaria, personagem_id, arquivado").eq("id", anuncioId).maybeSingle();
  if (!ad || ad.arquivado) throw new BusinessError("anuncio_inexistente");
  if (actor.papel !== "admin_plataforma" && actor.marcaId !== ad.marca_id) throw new BusinessError("anuncio_inexistente");
  const modelo = (ad.roteiro as { modelo?: string } | null)?.modelo;
  if (ad.personagem_id || !modelo || !["aguardando_aprovacao", "gerando_clipes", "montando", "pronto"].includes(ad.status)) throw new BusinessError("transicao_invalida");
  const { data: cenas } = await db.from("cenas").select("quadros!cenas_quadro_atual_id_fkey(status, imagem_path)").eq("anuncio_id", anuncioId);
  const prontas = (cenas ?? []).filter((c) => (c.quadros as unknown as { status: string; imagem_path: string | null } | null)?.status === "pronto");
  if (!prontas.length) throw new BusinessError("cenas_incompletas");
  // Confere serviço, marca e saldo ANTES de criar a personagem: sem isso sobraria personagem sem
  // ficha quando a cobrança fosse recusada (verificador, 01/11/2026).
  await assertProviderAvailable();
  const [{ data: marca }, { data: preco }] = await Promise.all([
    db.from("marcas").select("ativa, saldo_creditos").eq("id", ad.marca_id).single(),
    db.from("precos_acoes").select("creditos").eq("acao", "gerar_ficha_personagem").single(),
  ]);
  if (!marca?.ativa) throw new BusinessError("marca_inativa");
  if ((marca.saldo_creditos ?? 0) < (preco?.creditos ?? 0)) throw new BusinessError("saldo_insuficiente");
  const { data: p, error } = await db
    .from("personagens")
    .insert({ marca_id: ad.marca_id, nome: nome.trim().slice(0, 60) || "Personagem", genero_modelo: ad.genero_modelo, faixa_etaria: ad.faixa_etaria, modelo_en: modelo.slice(0, 600), origem: "anuncio", anuncio_origem_id: ad.id, criado_por: actor.id })
    .select("id")
    .single();
  if (error) throw error;
  await track({ nome: "adfit_personagem_do_anuncio", distinctId: actor.email ?? "", tela: "Anúncio", descricao: "salvou a modelo do anúncio como personagem", propriedades: { anuncio_id: ad.id, personagem_id: p.id } });
  const { fichaId } = await requestCharacterSheet(actor, p.id, undefined, deps);
  return { personagemId: p.id, fichaId };
}
