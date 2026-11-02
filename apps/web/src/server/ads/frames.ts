import "server-only";
import { createAdminClient } from "../db/supabase";
import type { AiClient, FrameQc } from "../claude/types";
import { loadPrompt } from "../prompts";
import { appendShortcutLines, redoRequest, type RedoInput } from "../prompts/redo-shortcuts";
import { CLAUSULA_IMAGEM } from "../prompts/clauses";
import { claudeImage } from "../storage";
import { AD_BUCKET } from "@/lib/storage-paths";
import { chainGeneration, getGeneration, submitGeneration, type GenerationDeps, type GenerationInput, type GenerationRow, type GenerationTarget } from "../higgsfield/process";
import { aiClient, runLater } from "./runtime";
import { randomUUID as randomUUIDv4 } from "node:crypto";
import { BusinessError } from "../api/http";
import { readConfig } from "../config";
import { transition } from "./stateMachine";
import { emailOf, track } from "../analytics/track";
import { assertProviderAvailable } from "../higgsfield/provider-health";
import { characterForAd } from "../characters/service";

/** Frases fixas da montagem do quadro (Anexo C.2 + roteiro.v2 aprovado em 01/11/2026). */
export const FRAME_REFERENCE_LINE = "Reference image 1 is the garment reference sheet.";
/** Personagem do catálogo (MD-17): a 2ª referência é a ficha da pessoa. */
export const FRAME_CHARACTER_LINE = "Reference image 2 is the character sheet: the model is exactly this person — same face, hair, skin tone and body; ignore the sheet's plain outfit, panels and grey background.";
export const FRAME_DRESS_LINE = "Dress the model in the garment shown in the sheet; do not reproduce the sheet layout, panels or grey background.";

/** Linha da nova tentativa depois de bloqueio por conteúdo (nsfw): enquadramento aberto e discreto. */
export const FRAME_SAFE_RETRY_LINE = "Wider shot with modest sports-advertising framing; the full outfit is visible in a relaxed, natural pose.";

/**
 * Termos de partes do corpo e de sensualização que os filtros de conteúdo dos modelos de imagem
 * barram (1º teste real: "chest slightly lifted" / "chest rising" → nsfw duas vezes). Proteção do
 * código, que não depende do Claude obedecer ao roteiro.v3 (mesmo espírito das cláusulas fixas, seção 20).
 */
const BODY_TERMS = /\b(chest|bust|busty|breasts?|cleavage|hips?|glutes?|butt|buttocks|booty|thighs?|abs|abdomen|belly|stomach|waist|curves?|curvy|tight|sexy|sensual|seductive|revealing|lifted)\b/i;

/**
 * Remove os trechos (separados por vírgula) que contêm termos de BODY_TERMS; frase que fica vazia
 * some. Não mexe no resto do texto. Recebe: prompt. Devolve: prompt limpo.
 */
export function stripBodyTerms(text: string): string {
  // Posição do logo é informação da peça: "logo … on the chest" / "chest logo" viram "front".
  const normalized = text
    .replace(/\b(logo|mark|print|brand mark)\b([^,.]*?)\b(on|across|at)\s+(the\s+)?(center of the\s+)?chest\b/gi, "$1$2$3 the front")
    .replace(/\bchest\s+(logo|mark|print)\b/gi, "front $1");
  return normalized
    .split(/(?<=\.)\s+/)
    .map((sentence) => {
      const end = sentence.endsWith(".") ? "." : "";
      const parts = sentence.replace(/\.$/, "").split(/,\s*/).filter((part) => !BODY_TERMS.test(part));
      return parts.length ? `${parts.join(", ")}${end}` : "";
    })
    .filter(Boolean)
    .join(" ");
}

/**
 * Monta o prompt do quadro pelo CÓDIGO (Anexo C.2, "Montagem do prompt do quadro" + roteiro.v2):
 * `prompt_quadro` + a modelo única do anúncio + referência à ficha + "vista a peça" + motivo do QC
 * (só na regeneração automática, regra 11.5) + enquadramento discreto (só na nova tentativa depois
 * de nsfw) + `CLAUSULA_IMAGEM` sempre no fim. Partes do corpo saem do texto (stripBodyTerms).
 * Recebe: prompt da cena, descrição da modelo, motivo opcional, se é nova tentativa pós-nsfw e se
 * há personagem do catálogo (2ª referência, MD-17).
 * Devolve: o prompt final.
 */
export function buildFramePrompt(promptQuadro: string, modelo: string, motivoQc?: string | null, safeRetry = false, comPersonagem = false): string {
  const motivo = motivoQc ? stripBodyTerms(motivoQc.trim()) : "";
  return [
    stripBodyTerms(promptQuadro.replace(CLAUSULA_IMAGEM, "").trim()),
    `The model (same person in every scene): ${stripBodyTerms(modelo.trim())}`,
    FRAME_REFERENCE_LINE,
    comPersonagem ? FRAME_CHARACTER_LINE : null,
    FRAME_DRESS_LINE,
    motivo ? `Fix from the previous attempt: ${motivo}` : null,
    safeRetry ? FRAME_SAFE_RETRY_LINE : null,
    CLAUSULA_IMAGEM,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Limites da regra 11.5. Recebe: saída do QC. Devolve: aprovado ou não (calculado pelo código). */
export function qcApproved(qc: FrameQc): boolean {
  return qc.fidelidade_peca >= 7 && qc.logo_visivel_correto >= 6 && qc.anatomia >= 6 && !qc.texto_espurio && !qc.conteudo_improprio;
}

type QcLog = { checagens: Array<FrameQc & { aprovado: boolean }>; erro_qc?: string };

/** Alvo `quadros` de uma geração `quadro_chave` (épico 8.5). */
export async function frameTarget(g: GenerationRow): Promise<GenerationTarget | null> {
  const db = createAdminClient();
  const { data: quadro } = await db.from("quadros").select("id, versao, cena_id, cenas!quadros_cena_id_fkey(ordem, anuncio_id)").eq("geracao_id", g.id).maybeSingle();
  if (!quadro) return null;
  const cena = quadro.cenas as unknown as { ordem: number; anuncio_id: string };
  return {
    table: "quadros",
    id: quadro.id,
    path: (ext) => `${AD_BUCKET}/${g.marca_id}/${cena.anuncio_id}/quadros/c${cena.ordem}-v${quadro.versao}-${g.id}.${ext}`,
    // Grava a imagem e agenda o QC (regra 11.5) fora da resposta do webhook (a Higgsfield espera 10 s).
    afterStored: async (gen, path) => {
      const { data } = await db.from("quadros").update({ imagem_path: path }).eq("id", quadro.id).eq("geracao_id", gen.id).eq("status", "gerando").select("id");
      if (data?.length) await runLater(() => runFrameQc(quadro.id));
    },
    // Quadro `falhou` (12.4) e confere o fechamento do anúncio (12.2; D-18: sem estorno por cena).
    afterFinalFailure: async (gen) => {
      await db.from("quadros").update({ status: "falhou" }).eq("id", quadro.id).eq("geracao_id", gen.id).eq("status", "gerando");
      await checkAdProgress(cena.anuncio_id);
    },
  };
}

/**
 * QC do quadro (Anexo C.4, regra 11.5): compara a imagem com a ficha do anúncio pelo Claude; a
 * aprovação é calculada no código. 1ª reprovação → regenera o mesmo quadro sem cobrança, com o
 * motivo no prompt. 2ª reprovação → `pronto` com `qc_aprovado = false` (aviso na tela).
 * `conteudo_improprio` → `falhou` e nunca é mostrado. QC indisponível (Claude falhou 2×) → `pronto`
 * com `qc_aprovado` nulo (D-19). Idempotente: só age se o quadro ainda está `gerando` com imagem.
 * Recebe: quadro e dependências. Devolve: nada.
 */
export async function runFrameQc(quadroId: string, deps: { ai?: AiClient; generation?: GenerationDeps } = {}): Promise<void> {
  const db = createAdminClient();
  const { data: q } = await db
    .from("quadros")
    .select("id, marca_id, cena_id, status, imagem_path, geracao_id, qc_detalhe, cenas!quadros_cena_id_fkey(ordem, anuncio_id, anuncios(ficha_id, fichas_produto!anuncios_ficha_id_fkey(imagem_path)))")
    .eq("id", quadroId)
    .maybeSingle();
  if (!q || q.status !== "gerando" || !q.imagem_path || !q.geracao_id) return;
  const cena = q.cenas as unknown as { ordem: number; anuncio_id: string; anuncios: { fichas_produto: { imagem_path: string } } };
  const log: QcLog = (q.qc_detalhe as QcLog | null) ?? { checagens: [] };

  let qc: FrameQc;
  try {
    const ai = deps.ai ?? aiClient();
    const [ficha, quadro] = await Promise.all([claudeImage(q.marca_id, cena.anuncios.fichas_produto.imagem_path), claudeImage(q.marca_id, q.imagem_path)]);
    qc = await ai.checkFrame({ system: loadPrompt("qcQuadro").texto, ficha, quadro });
  } catch (e) {
    const done = await finishFrame(q.id, q.geracao_id, { status: "pronto", qc_aprovado: null, qc_detalhe: { ...log, erro_qc: e instanceof Error ? e.message.slice(0, 200) : "qc_falhou" } });
    if (done) {
      await db.from("cenas").update({ quadro_atual_id: q.id }).eq("id", q.cena_id).is("quadro_atual_id", null);
      await checkAdProgress(cena.anuncio_id);
    }
    return;
  }

  const aprovado = qcApproved(qc);
  const detalhe: QcLog = { ...log, checagens: [...log.checagens, { ...qc, aprovado }] };

  if (qc.conteudo_improprio) {
    if (await finishFrame(q.id, q.geracao_id, { status: "falhou", qc_aprovado: false, qc_detalhe: detalhe })) await checkAdProgress(cena.anuncio_id);
    return;
  }

  if (!aprovado && log.checagens.length === 0) {
    // 1ª reprovação: regenera sem cobrança, com o motivo anexado ao prompt (regra 11.5).
    const g = await getGeneration(q.geracao_id);
    if (!g) return;
    const entrada = g.entrada as GenerationInput & { prompt_cena: string; modelo: string };
    const prompt = buildFramePrompt(entrada.prompt_cena, entrada.modelo, qc.motivo, false, !!entrada.personagem);
    const { data: saved } = await db.from("quadros").update({ qc_detalhe: detalhe as never, imagem_path: null }).eq("id", q.id).eq("geracao_id", g.id).eq("status", "gerando").select("id");
    if (!saved?.length) return;
    const nextId = await chainGeneration(g, { table: "quadros", id: q.id }, { tentativa: 1, entrada: { ...entrada, prompt, motivo_qc: qc.motivo } as GenerationInput });
    if (nextId) await submitGeneration(nextId, deps.generation);
    return;
  }

  if (await finishFrame(q.id, q.geracao_id, { status: "pronto", qc_aprovado: aprovado, qc_detalhe: detalhe })) {
    // Cena que estava sem imagem (falhou antes) passa a usar esta versão (D-18).
    await db.from("cenas").update({ quadro_atual_id: q.id }).eq("id", q.cena_id).is("quadro_atual_id", null);
    await checkAdProgress(cena.anuncio_id);
  }
}

/** Fecha o quadro só se ele ainda segue a mesma geração e está `gerando`. Devolve: se fechou. */
async function finishFrame(id: string, geracaoId: string, fields: { status: "pronto" | "falhou"; qc_aprovado: boolean | null; qc_detalhe: unknown }): Promise<boolean> {
  const { data } = await createAdminClient()
    .from("quadros")
    .update({ ...fields, qc_detalhe: fields.qc_detalhe as never })
    .eq("id", id)
    .eq("geracao_id", geracaoId)
    .eq("status", "gerando")
    .select("id");
  return (data?.length ?? 0) > 0;
}

/**
 * Fechamento da etapa de quadros (seção 12.2 e D-18): quando a versão mais recente de cada uma das
 * 3 cenas está em estado final, aponta `cenas.quadro_atual_id` para o quadro pronto e leva o anúncio
 * a `aguardando_aprovacao` (≥ 1 pronto) ou a `falhou` com estorno integral (os 3 falharam).
 * Idempotente (transição condicional). Recebe: anúncio. Devolve: nada.
 */
export async function checkAdProgress(anuncioId: string): Promise<void> {
  const db = createAdminClient();
  const { data: ad } = await db.from("anuncios").select("id, status").eq("id", anuncioId).maybeSingle();
  if (!ad || ad.status !== "gerando_quadros") return;
  const { data: cenas } = await db.from("cenas").select("id, ordem, quadro_atual_id, quadros!quadros_cena_id_fkey(id, versao, status)").eq("anuncio_id", anuncioId);
  if (!cenas || cenas.length !== 3) return;

  const latest = cenas.map((c) => {
    const qs = [...((c.quadros ?? []) as Array<{ id: string; versao: number; status: string }>)].sort((a, b) => b.versao - a.versao);
    return { cena: c, quadro: qs[0] };
  });
  if (latest.some((l) => !l.quadro || l.quadro.status === "gerando")) return;

  for (const l of latest) {
    if (l.quadro.status === "pronto" && l.cena.quadro_atual_id !== l.quadro.id) {
      await db.from("cenas").update({ quadro_atual_id: l.quadro.id }).eq("id", l.cena.id);
    }
  }
  const criador = async () => (await emailOf((await db.from("anuncios").select("criado_por").eq("id", anuncioId).single()).data?.criado_por)) ?? "";
  if (latest.some((l) => l.quadro.status === "pronto")) {
    if (await transition(anuncioId, "gerando_quadros", "aguardando_aprovacao")) {
      const prontas = latest.filter((l) => l.quadro.status === "pronto").length;
      await track({ nome: "adfit_anuncio_cenas_prontas", distinctId: await criador(), tela: "Anúncio", descricao: "as cenas do anúncio ficaram prontas para escolher", propriedades: { anuncio_id: anuncioId, cenas_prontas: prontas } });
    }
    return;
  }
  if (await transition(anuncioId, "gerando_quadros", "falhou", { erro: "os_3_quadros_falharam" })) {
    await refundAd(anuncioId, "Falha técnica nos 3 quadros do anúncio");
    await track({ nome: "adfit_anuncio_falhou", distinctId: await criador(), tela: "Anúncio", descricao: "as 3 cenas do anúncio falharam (créditos estornados)", propriedades: { anuncio_id: anuncioId, etapa: "cenas" } });
  }
}

/**
 * Estorno integral do `gerar_roteiro_quadros` de um anúncio (12.2: Claude falhou ou os 3 quadros
 * falharam). Acha o consumo pela referência do anúncio. Idempotente (`ja_estornado`).
 */
export async function refundAd(anuncioId: string, observacao: string): Promise<void> {
  const db = createAdminClient();
  const { data: consumo } = await db
    .from("movimentacoes_creditos")
    .select("id")
    .eq("referencia_id", anuncioId)
    .eq("tipo", "consumo")
    .eq("acao", "gerar_roteiro_quadros")
    .maybeSingle();
  if (!consumo) return;
  const { error } = await db.rpc("estornar_creditos", { p_movimentacao_id: consumo.id, p_observacao: observacao });
  if (error && error.message !== "ja_estornado") throw error;
}

type FrameActor = { id: string; papel: "admin_plataforma" | "usuario_marca"; marcaId: string | null; email?: string };

/**
 * POST /api/cenas/:id/refazer-quadro (seção 13; critérios 8.6): anúncio em `aguardando_aprovacao`,
 * sem outro quadro da cena em geração. Debita `refazer_quadro` — GRÁTIS quando a cena só tem quadro
 * `falhou` (D-18, decisão do Alexandre). Instrução opcional vira ajuste do prompt pelo Claude (C.3,
 * tipo quadro), mantendo a ficha como referência; nova versão passa pelo QC (11.5).
 * Recebe: ator, cena e instrução (≤ 200). Devolve: nada.
 */
export async function redoFrame(actor: FrameActor, cenaId: string, instrucao: RedoInput, deps: { ai?: AiClient; generation?: GenerationDeps } = {}): Promise<void> {
  const db = createAdminClient();
  const { data: cena } = await db
    .from("cenas")
    .select("id, ordem, marca_id, anuncio_id, prompt_quadro, quadros!quadros_cena_id_fkey(id, versao, status, geracao_id)")
    .eq("id", cenaId)
    .maybeSingle();
  if (!cena) throw new BusinessError("anuncio_inexistente");
  if (actor.papel !== "admin_plataforma" && actor.marcaId !== cena.marca_id) throw new BusinessError("anuncio_inexistente");
  const { data: ad } = await db.from("anuncios").select("status, roteiro, prompt_versao, ficha_id, personagem_id, fichas_produto!anuncios_ficha_id_fkey(imagem_path), formato").eq("id", cena.anuncio_id).single();
  if (ad?.status !== "aguardando_aprovacao") throw new BusinessError("transicao_invalida");
  const quadros = [...((cena.quadros ?? []) as Array<{ id: string; versao: number; status: string; geracao_id: string | null }>)].sort((a, b) => b.versao - a.versao);
  if (quadros.some((q) => q.status === "gerando")) throw new BusinessError("transicao_invalida");
  const free = quadros.length > 0 && !quadros.some((q) => q.status === "pronto");

  // Saldo da Higgsfield esgotado: barra antes de cobrar (pedido do Alexandre, 01/11/2026).
  await assertProviderAvailable();
  const quadroId = randomUUIDv4();
  let cobrancaId: string | null = null;
  if (!free) {
    const { data, error } = await db.rpc("debitar_creditos", { p_marca_id: cena.marca_id, p_acao: "refazer_quadro", p_quantidade_itens: 1, p_referencia_tipo: "quadro", p_referencia_id: quadroId, p_criado_por: actor.id });
    if (error) throw error;
    cobrancaId = data as string | null;
  }

  // Prompt atual da cena = o da última geração (pode já ter sido ajustado antes).
  const last = quadros[0];
  const lastEntrada = last?.geracao_id ? ((await db.from("geracoes").select("entrada").eq("id", last.geracao_id).maybeSingle()).data?.entrada as (GenerationInput & { prompt_cena?: string; modelo?: string }) | undefined) : undefined;
  const modelo = lastEntrada?.modelo ?? (ad.roteiro as { modelo?: string } | null)?.modelo ?? "";
  let promptCena = lastEntrada?.prompt_cena ?? cena.prompt_quadro;
  const redo = redoRequest("quadro", instrucao);
  const pedido = redo.pedido;
  let resumo: string | null = null;
  try {
    if (pedido || !free) {
      const adjusted = await (deps.ai ?? aiClient()).adjustPrompt({ tipo: "quadro", promptAtual: promptCena, pedido });
      promptCena = adjusted.prompt.replace(CLAUSULA_IMAGEM, "").trim();
      resumo = adjusted.resumo_pt;
    }
  } catch (e) {
    console.error("Refação de quadro sem ajuste do Claude:", e instanceof Error ? e.message : e);
  }
  // Atalhos: linhas fixas acrescentadas pelo código, mesmo se o Claude falhar.
  promptCena = appendShortcutLines(promptCena, redo.linhas);
  // Imagens das cenas no modelo próprio (MD-12: Marketing Studio Flare).
  const { modelo_quadro } = await readConfig(["modelo_quadro"]);
  const fichaPath = (ad.fichas_produto as unknown as { imagem_path: string }).imagem_path;
  // Personagem do catálogo (MD-17): mantém a 2ª referência na refação.
  const personagem = await characterForAd(ad.personagem_id as string | null, cena.marca_id);
  const entrada = {
    prompt: buildFramePrompt(promptCena, modelo, null, false, !!personagem),
    prompt_base: promptCena,
    prompt_versao: ad.prompt_versao ?? "",
    referencias: personagem ? [fichaPath, personagem.fichaPath] : [fichaPath],
    personagem: !!personagem,
    aspect_ratio: ad.formato === "vertical_9_16" ? "9:16" : "16:9",
    prompt_cena: promptCena,
    modelo,
    resumo_refacao: resumo,
  };
  const { data: g, error: gErr } = await db.from("geracoes").insert({ marca_id: cena.marca_id, tipo: "quadro_chave", modelo: String(modelo_quadro), entrada: entrada as never, cobranca_id: cobrancaId }).select("id").single();
  if (gErr) throw gErr;
  const { error: qErr } = await db.from("quadros").insert({ id: quadroId, cena_id: cena.id, marca_id: cena.marca_id, versao: (last?.versao ?? 0) + 1, status: "gerando", geracao_id: g.id, instrucao_refacao: redo.registro || null });
  if (qErr) throw qErr;
  await submitGeneration(g.id, deps.generation);
}

/**
 * POST /api/cenas/:id/usar-quadro (seção 13): quadro `pronto` da mesma cena, anúncio em
 * `aguardando_aprovacao` → `cenas.quadro_atual_id`. Recebe: ator, cena e quadro.
 */
export async function selectFrame(actor: FrameActor, cenaId: string, quadroId: string): Promise<void> {
  const db = createAdminClient();
  const { data: q } = await db.from("quadros").select("id, status, cena_id, marca_id, cenas!quadros_cena_id_fkey(anuncio_id)").eq("id", quadroId).maybeSingle();
  if (!q || q.cena_id !== cenaId) throw new BusinessError("anuncio_inexistente");
  if (actor.papel !== "admin_plataforma" && actor.marcaId !== q.marca_id) throw new BusinessError("anuncio_inexistente");
  if (q.status !== "pronto") throw new BusinessError("transicao_invalida");
  const { data: ad } = await db.from("anuncios").select("status").eq("id", (q.cenas as unknown as { anuncio_id: string }).anuncio_id).single();
  if (ad?.status !== "aguardando_aprovacao") throw new BusinessError("transicao_invalida");
  await db.from("cenas").update({ quadro_atual_id: quadroId }).eq("id", cenaId);
}
