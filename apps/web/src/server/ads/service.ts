import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "../db/supabase";
import { BusinessError } from "../api/http";
import { readConfig } from "../config";
import { claudeImage, signBrandPaths } from "../storage";
import { generationDeps, submitGeneration, type GenerationDeps, type GenerationInput } from "../higgsfield/process";
import { refreshStaleGenerations } from "../higgsfield/stale";
import type { AiClient } from "../claude/types";
import { buildFramePrompt, checkAdProgress, refundAd, runFrameQc } from "./frames";
import { aiClient, runLater } from "./runtime";
import { buildScriptSystem, sanitizeScreenTexts } from "./script";
import { isBusy, transition, type AdStatus } from "./stateMachine";
import { hasForbiddenTerm } from "@/lib/forbidden-terms";
import { validateScreenText } from "@/lib/text-rules";
import { getDictionary, type Locale } from "@/lib/i18n";

/** Quem pede: usuário da marca (só a própria) ou admin (seção 13: rotas "marca/admin"). */
export type AdActor = { id: string; papel: "admin_plataforma" | "usuario_marca"; marcaId: string | null; idioma: Locale };

/** Corpo de `POST /api/anuncios` (opções da 11.4 + `produto_id`; limites da 11.7). */
export const createAdSchema = z
  .object({
    produto_id: z.string().uuid(),
    cenario: z.enum(["academia", "box_crossfit", "estudio_funcional", "ao_ar_livre_urbano", "ao_ar_livre_natureza", "pista_de_corrida"]),
    modalidade: z.enum(["musculacao", "crossfit", "hyrox", "corrida", "funcional", "yoga_pilates"]),
    genero_modelo: z.enum(["mulher", "homem"]),
    faixa_etaria: z.enum(["de_20_a_30", "de_30_a_45", "acima_de_45"]),
    estilo: z.enum(["energetico", "cinematografico", "lifestyle"]),
    formato: z.enum(["vertical_9_16", "horizontal_16_9"]),
    com_texto: z.boolean(),
    texto_oferta: z.string().trim().max(40).optional(),
    observacoes: z.string().trim().max(200).optional(),
  })
  .strict();
export type CreateAdInput = z.infer<typeof createAdSchema>;

/** Varredura de órfãos: etapa parada há mais que isso (acima da duração máxima de uma função). */
export const AD_ORPHAN_AFTER_MS = 6 * 60_000;

function assertOwner(actor: AdActor, marcaId: string): void {
  if (actor.papel !== "admin_plataforma" && actor.marcaId !== marcaId) throw new BusinessError("anuncio_inexistente");
}

/**
 * POST /api/anuncios (seção 13; critérios 8.5). Valida produto da marca, não arquivado e com ficha
 * aprovada; debita `gerar_roteiro_quadros` ANTES do Claude (11.2.1), já referenciando o anúncio;
 * cria o anúncio `gerando_roteiro` com a ficha congelada (11.3) e agenda o pipeline (roteiro →
 * quadros) fora da resposta. Marca pausada → `marca_inativa` pelo débito.
 * Recebe: ator e opções. Devolve: { anuncioId }.
 */
export async function createAd(actor: AdActor, input: CreateAdInput, deps: { ai?: AiClient; generation?: GenerationDeps } = {}): Promise<{ anuncioId: string }> {
  const db = createAdminClient();
  const { data: produto } = await db.from("produtos").select("id, marca_id, nome, arquivado, ficha_aprovada_id").eq("id", input.produto_id).maybeSingle();
  if (!produto || (actor.papel !== "admin_plataforma" && actor.marcaId !== produto.marca_id)) throw new BusinessError("produto_inexistente");
  if (produto.arquivado) throw new BusinessError("produto_arquivado");
  if (!produto.ficha_aprovada_id) throw new BusinessError("produto_sem_ficha");

  const t = getDictionary(actor.idioma);
  const anuncioId = randomUUID();
  const titulo = `${produto.nome} · ${t.opcoes.cenarios[input.cenario]} · ${input.formato === "vertical_9_16" ? "9:16" : "16:9"}`;

  const { data: cobrancaId, error: debitErr } = await db.rpc("debitar_creditos", {
    p_marca_id: produto.marca_id,
    p_acao: "gerar_roteiro_quadros",
    p_quantidade_itens: 1,
    p_referencia_tipo: "anuncio",
    p_referencia_id: anuncioId,
    p_criado_por: actor.id,
  });
  if (debitErr) throw debitErr;

  const { error: insErr } = await db.from("anuncios").insert({
    id: anuncioId,
    marca_id: produto.marca_id,
    produto_id: produto.id,
    ficha_id: produto.ficha_aprovada_id,
    criado_por: actor.id,
    titulo,
    cenario: input.cenario,
    modalidade: input.modalidade,
    genero_modelo: input.genero_modelo,
    faixa_etaria: input.faixa_etaria,
    estilo: input.estilo,
    formato: input.formato,
    com_texto: input.com_texto,
    texto_oferta: input.texto_oferta || null,
    observacoes: input.observacoes || null,
    status: "gerando_roteiro",
  });
  if (insErr) {
    if (cobrancaId) await db.rpc("estornar_creditos", { p_movimentacao_id: cobrancaId, p_observacao: "Falha ao criar o anúncio" });
    throw insErr;
  }

  await runLater(() => runAdPipeline(anuncioId, deps));
  return { anuncioId };
}

/**
 * Pipeline do anúncio (seções 4.4 e 12.2; critérios 8.5): roteiro pelo Claude (roteiro.v2 com a
 * ficha como imagem; schema validado; 2 tentativas) → saneamento do texto da tela (seção 20, C.6)
 * → 3 cenas → `gerando_quadros` → 3 quadros submetidos em paralelo. Claude falha → `falhou` +
 * estorno integral. Idempotente: só roda a partir de `gerando_roteiro` (cenas com unique por ordem).
 * Recebe: anúncio e dependências. Devolve: nada.
 */
export async function runAdPipeline(anuncioId: string, deps: { ai?: AiClient; generation?: GenerationDeps } = {}): Promise<void> {
  const db = createAdminClient();
  const { data: ad } = await db
    .from("anuncios")
    .select("*, produtos(nome, categoria, genero_alvo, descricao), marcas(nome, instagram, cta_padrao, tom_de_voz, idioma_anuncios), fichas_produto!anuncios_ficha_id_fkey(imagem_path), perfis!anuncios_criado_por_fkey(idioma)")
    .eq("id", anuncioId)
    .maybeSingle();
  if (!ad || ad.status !== "gerando_roteiro") return;
  const produto = ad.produtos as { nome: string; categoria: string; genero_alvo: string; descricao: string | null };
  const marca = ad.marcas as { nome: string; instagram: string | null; cta_padrao: string; tom_de_voz: string | null; idioma_anuncios: "pt_br" | "en" };
  const fichaPath = (ad.fichas_produto as { imagem_path: string | null }).imagem_path;
  const idiomaCriador = ((ad.perfis as { idioma: "pt_br" | "en" } | null)?.idioma ?? "pt_br") as "pt_br" | "en";
  const ai = deps.ai ?? aiClient();

  const fail = async (erro: string) => {
    if (await transition(anuncioId, "gerando_roteiro", "falhou", { erro: erro.slice(0, 500) })) await refundAd(anuncioId, "Falha técnica ao criar o roteiro");
  };

  // 1. Roteiro (Anexo C.2 / roteiro.v2).
  let script;
  let versao: string;
  try {
    if (!fichaPath) throw new Error("ficha_sem_imagem");
    const system = buildScriptSystem({
      genero_modelo: ad.genero_modelo,
      faixa_etaria: ad.faixa_etaria,
      formato: ad.formato,
      tom_de_voz: marca.tom_de_voz,
      idioma_texto: marca.idioma_anuncios,
      idioma_descricao: idiomaCriador,
    });
    versao = system.versao;
    script = await ai.writeScript({
      system: system.texto,
      ficha: await claudeImage(ad.marca_id, fichaPath),
      dados: {
        produto: { nome: produto.nome, categoria: produto.categoria, genero_alvo: produto.genero_alvo, descricao: produto.descricao },
        marca: { nome: marca.nome, instagram: marca.instagram, cta: marca.cta_padrao },
        escolhas: {
          cenario: ad.cenario,
          modalidade: ad.modalidade,
          genero_modelo: ad.genero_modelo,
          faixa_etaria: ad.faixa_etaria,
          estilo: ad.estilo,
          formato: ad.formato,
          com_texto: ad.com_texto,
          texto_oferta: ad.texto_oferta,
        },
        observacoes_do_lojista: ad.observacoes,
      },
    });
  } catch (e) {
    console.error(`Roteiro do anúncio ${anuncioId} falhou:`, e instanceof Error ? e.message : e);
    return fail(`roteiro: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 2. Texto da tela saneado (seção 20; 11.7; C.6).
  const textos = await sanitizeScreenTexts(script, ad.com_texto, marca.idioma_anuncios, ai, idiomaCriador);
  const cenasRoteiro = [...script.cenas].sort((a, b) => a.ordem - b.ordem).map((c) => ({ ...c, texto_tela: textos[c.ordem] }));

  // 3. Cenas (unique por anúncio+ordem impede duplicar se o pipeline rodar duas vezes).
  const { data: cenas, error: cenasErr } = await db
    .from("cenas")
    .insert(cenasRoteiro.map((c) => ({ anuncio_id: anuncioId, marca_id: ad.marca_id, ordem: c.ordem, descricao: c.descricao, prompt_quadro: c.prompt_quadro, prompt_movimento: c.prompt_movimento, texto_tela: c.texto_tela })))
    .select("id, ordem, prompt_quadro");
  if (cenasErr || !cenas) {
    if (cenasErr?.code === "23505") return;
    return fail(`cenas: ${cenasErr?.message ?? "sem_retorno"}`);
  }
  const promptVersao = `${versao}+quadro.v2`;
  if (!(await transition(anuncioId, "gerando_roteiro", "gerando_quadros", { roteiro: { ...script, cenas: cenasRoteiro } as never, prompt_versao: promptVersao }))) return;

  // 4. Quadros v1 das 3 cenas, submetidos em paralelo (critério 8.5).
  const { modelo_imagem } = await readConfig(["modelo_imagem"]);
  const { data: consumo } = await db.from("movimentacoes_creditos").select("id").eq("referencia_id", anuncioId).eq("tipo", "consumo").maybeSingle();
  const generation = deps.generation ?? generationDeps();
  await Promise.all(
    cenas.map(async (cena) => {
      const quadroId = randomUUID();
      const entrada: GenerationInput & { prompt_cena: string; modelo: string } = {
        prompt: buildFramePrompt(cena.prompt_quadro, script.modelo),
        prompt_base: cena.prompt_quadro,
        prompt_versao: promptVersao,
        referencias: [fichaPath!],
        aspect_ratio: ad.formato === "vertical_9_16" ? "9:16" : "16:9",
        prompt_cena: cena.prompt_quadro,
        modelo: script.modelo,
      };
      const { data: g, error: gErr } = await db
        .from("geracoes")
        .insert({ marca_id: ad.marca_id, tipo: "quadro_chave", modelo: String(modelo_imagem), entrada: entrada as never, cobranca_id: consumo?.id ?? null })
        .select("id")
        .single();
      if (gErr) throw gErr;
      const { error: qErr } = await db.from("quadros").insert({ id: quadroId, cena_id: cena.id, marca_id: ad.marca_id, versao: 1, status: "gerando", geracao_id: g.id });
      if (qErr) {
        // A varredura de órfãos já criou a v1 desta cena: não submete geração sem alvo (custo à toa).
        await db.from("geracoes").update({ status: "falhou", erro: "alvo_ja_resolvido", concluido_em: new Date().toISOString() }).eq("id", g.id);
        return;
      }
      await submitGeneration(g.id, generation);
    }),
  );
}

/**
 * Estado do anúncio para a tela e o polling de 5 s (D-20). Nunca devolve prompt, modelo, roteiro
 * técnico ou custo (seção 5). Recebe: ator e anúncio. Devolve: anúncio, cenas e quadros com URL assinada.
 */
export async function getAdView(actor: AdActor, anuncioId: string) {
  const db = createAdminClient();
  const { data: ad } = await db
    .from("anuncios")
    .select("id, marca_id, produto_id, titulo, status, formato, com_texto, texto_oferta, arquivado, criado_em, atualizado_em")
    .eq("id", anuncioId)
    .maybeSingle();
  if (!ad || ad.arquivado) throw new BusinessError("anuncio_inexistente");
  assertOwner(actor, ad.marca_id);
  const { data: cenas } = await db
    .from("cenas")
    .select("id, ordem, descricao, texto_tela, quadro_atual_id, quadros!quadros_cena_id_fkey(id, versao, status, imagem_path, qc_aprovado)")
    .eq("anuncio_id", anuncioId)
    .order("ordem");
  const quadros = (cenas ?? []).flatMap((c) => (c.quadros ?? []) as Array<{ id: string; versao: number; status: string; imagem_path: string | null; qc_aprovado: boolean | null }>);
  const urls = await signBrandPaths(ad.marca_id, quadros.flatMap((q) => (q.status === "pronto" && q.imagem_path ? [q.imagem_path] : [])));
  return {
    id: ad.id,
    titulo: ad.titulo,
    status: ad.status as AdStatus,
    formato: ad.formato,
    comTexto: ad.com_texto,
    textoOferta: ad.texto_oferta,
    cenas: (cenas ?? []).map((c) => ({
      id: c.id,
      ordem: c.ordem as 1 | 2 | 3,
      descricao: c.descricao,
      textoTela: c.texto_tela,
      quadroAtualId: c.quadro_atual_id,
      quadros: [...((c.quadros ?? []) as typeof quadros)]
        .sort((a, b) => a.versao - b.versao)
        .map((q) => ({
          id: q.id,
          versao: q.versao,
          status: q.status as "gerando" | "pronto" | "descartado" | "falhou",
          // Conteúdo impróprio vira `falhou` e nunca tem URL (regra 11.5).
          url: q.status === "pronto" && q.imagem_path ? (urls[q.imagem_path] ?? null) : null,
          avisoQc: q.status === "pronto" && q.qc_aprovado === false,
        })),
    })),
  };
}

/**
 * Varredura de órfãos do anúncio, chamada pelo polling da tela (D-15/D-20; seções 4.3 e 12.2):
 * roteiro parado há > 6 min → `falhou` + estorno; cena sem quadro há > 6 min → quadro `falhou`;
 * gerações paradas → reconsulta/timeout; quadro com imagem e QC que não rodou há > 3 min → roda o
 * QC; por fim confere o fechamento. Recebe: anúncio. Devolve: nada.
 */
export async function refreshAd(anuncioId: string, now = Date.now()): Promise<void> {
  const db = createAdminClient();
  const { data: ad } = await db.from("anuncios").select("id, status, marca_id, atualizado_em").eq("id", anuncioId).maybeSingle();
  if (!ad) return;
  const age = now - new Date(ad.atualizado_em).getTime();

  // Mesmo com cenas gravadas (função encerrada antes da transição), o roteiro não foi salvo:
  // falha e estorna — nunca deixar o anúncio preso com crédito debitado.
  if (ad.status === "gerando_roteiro" && age > AD_ORPHAN_AFTER_MS) {
    if (await transition(anuncioId, "gerando_roteiro", "falhou", { erro: "roteiro_orfao" })) await refundAd(anuncioId, "Falha técnica ao criar o roteiro");
    return;
  }
  if (ad.status !== "gerando_quadros") return;

  const { data: cenas } = await db.from("cenas").select("id, quadros!quadros_cena_id_fkey(id, status, imagem_path, geracao_id)").eq("anuncio_id", anuncioId);
  const all = (cenas ?? []).flatMap((c) => (c.quadros ?? []) as Array<{ id: string; status: string; imagem_path: string | null; geracao_id: string | null }>);
  if (age > AD_ORPHAN_AFTER_MS) {
    for (const c of cenas ?? []) {
      if (!(c.quadros ?? []).length) await db.from("quadros").insert({ cena_id: c.id, marca_id: ad.marca_id, versao: 1, status: "falhou" });
    }
  }
  const gerando = all.filter((q) => q.status === "gerando" && q.geracao_id);
  await refreshStaleGenerations({ geracaoIds: gerando.map((q) => q.geracao_id!) }, now);

  const withImage = gerando.filter((q) => q.imagem_path);
  if (withImage.length) {
    const { data: gens } = await db.from("geracoes").select("id, status, concluido_em").in("id", withImage.map((q) => q.geracao_id!));
    for (const q of withImage) {
      const g = gens?.find((x) => x.id === q.geracao_id);
      if (g?.status === "concluida" && g.concluido_em && now - new Date(g.concluido_em).getTime() > 3 * 60_000) await runFrameQc(q.id);
    }
  }
  await checkAdProgress(anuncioId);
}

/** Corpo de `PATCH /api/anuncios/:id/textos` (seção 13; limites da 11.7). */
export const patchTextsSchema = z
  .object({
    cenas: z.array(z.object({ id: z.string().uuid(), texto_tela: z.string().nullable() })).max(3).default([]),
    texto_oferta: z.string().trim().max(40).nullable().optional(),
  })
  .strict();

/**
 * PATCH /api/anuncios/:id/textos (seção 13; critério 8.5 "texto editável aqui"): status
 * `aguardando_aprovacao` (`pronto` → `montando` entra no 8.7); cada texto em 2×32 sem emoji; a cena
 * 3 não leva texto (11.3). Termo proibido digitado pelo usuário NÃO bloqueia: volta como aviso (11.7).
 * Recebe: ator, anúncio e corpo. Devolve: { avisos: ids das cenas com termo proibido }.
 */
export async function patchAdTexts(actor: AdActor, anuncioId: string, body: z.infer<typeof patchTextsSchema>): Promise<{ avisos: string[] }> {
  const db = createAdminClient();
  const { data: ad } = await db.from("anuncios").select("id, marca_id, status, arquivado").eq("id", anuncioId).maybeSingle();
  if (!ad || ad.arquivado) throw new BusinessError("anuncio_inexistente");
  assertOwner(actor, ad.marca_id);
  if (ad.status !== "aguardando_aprovacao") throw new BusinessError("transicao_invalida");
  const { data: cenas } = await db.from("cenas").select("id, ordem").eq("anuncio_id", anuncioId);
  const avisos: string[] = [];
  for (const c of body.cenas) {
    const cena = cenas?.find((x) => x.id === c.id);
    if (!cena) throw new BusinessError("validacao");
    const texto = c.texto_tela?.trim() ? c.texto_tela.replace(/\r/g, "").trim() : null;
    if (texto && (cena.ordem === 3 || validateScreenText(texto))) throw new BusinessError("validacao");
    if (hasForbiddenTerm(texto)) avisos.push(c.id);
  }
  for (const c of body.cenas) {
    const texto = c.texto_tela?.trim() ? c.texto_tela.replace(/\r/g, "").trim() : null;
    await db.from("cenas").update({ texto_tela: texto }).eq("id", c.id).eq("anuncio_id", anuncioId);
  }
  if (body.texto_oferta !== undefined) await db.from("anuncios").update({ texto_oferta: body.texto_oferta || null }).eq("id", anuncioId);
  return { avisos };
}

/**
 * Lista de anúncios da marca (tela [Marca] Anúncios; biblioteca com filtros fica no 8.8): não
 * arquivados, mais recentes primeiro, com miniatura do quadro atual da cena 1.
 * Recebe: marca. Devolve: anúncios.
 */
export async function listAds(marcaId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("anuncios")
    .select("id, titulo, status, formato, criado_em, cenas(ordem, quadros!cenas_quadro_atual_id_fkey(imagem_path))")
    .eq("marca_id", marcaId)
    .eq("arquivado", false)
    .order("criado_em", { ascending: false });
  const rows = (data ?? []).map((a) => {
    const c1 = ((a.cenas ?? []) as Array<{ ordem: number; quadros: { imagem_path: string | null } | null }>).find((c) => c.ordem === 1);
    return { id: a.id, titulo: a.titulo, status: a.status as AdStatus, formato: a.formato, criadoEm: a.criado_em, thumbPath: c1?.quadros?.imagem_path ?? null };
  });
  const urls = await signBrandPaths(marcaId, rows.flatMap((r) => (r.thumbPath ? [r.thumbPath] : [])));
  return rows.map((r) => ({ ...r, thumb: r.thumbPath ? (urls[r.thumbPath] ?? null) : null, busy: isBusy(r.status) }));
}
