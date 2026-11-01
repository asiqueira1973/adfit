import "server-only";
import { createAdminClient } from "../db/supabase";
import type { AiClient, FrameQc } from "../claude/types";
import { loadPrompt } from "../prompts";
import { CLAUSULA_IMAGEM } from "../prompts/clauses";
import { claudeImage } from "../storage";
import { AD_BUCKET } from "@/lib/storage-paths";
import { chainGeneration, getGeneration, submitGeneration, type GenerationDeps, type GenerationInput, type GenerationRow, type GenerationTarget } from "../higgsfield/process";
import { aiClient, runLater } from "./runtime";
import { transition } from "./stateMachine";

/** Frases fixas da montagem do quadro (Anexo C.2 + roteiro.v2 aprovado em 01/11/2026). */
export const FRAME_REFERENCE_LINE = "Reference image 1 is the garment reference sheet.";
export const FRAME_DRESS_LINE = "Dress the model in the garment shown in the sheet; do not reproduce the sheet layout, panels or grey background.";

/**
 * Monta o prompt do quadro pelo CÓDIGO (Anexo C.2, "Montagem do prompt do quadro" + roteiro.v2):
 * `prompt_quadro` + a modelo única do anúncio + referência à ficha + "vista a peça" + motivo do QC
 * (só na regeneração automática, regra 11.5) + `CLAUSULA_IMAGEM` sempre no fim.
 * Recebe: prompt da cena, descrição da modelo e motivo opcional. Devolve: o prompt final.
 */
export function buildFramePrompt(promptQuadro: string, modelo: string, motivoQc?: string | null): string {
  return [
    promptQuadro.replace(CLAUSULA_IMAGEM, "").trim(),
    `The model (same person in every scene): ${modelo.trim()}`,
    FRAME_REFERENCE_LINE,
    FRAME_DRESS_LINE,
    motivoQc ? `Fix from the previous attempt: ${motivoQc.trim()}` : null,
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
    .select("id, marca_id, status, imagem_path, geracao_id, qc_detalhe, cenas!quadros_cena_id_fkey(ordem, anuncio_id, anuncios(ficha_id, fichas_produto!anuncios_ficha_id_fkey(imagem_path)))")
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
    if (done) await checkAdProgress(cena.anuncio_id);
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
    const prompt = buildFramePrompt(entrada.prompt_cena, entrada.modelo, qc.motivo);
    const { data: saved } = await db.from("quadros").update({ qc_detalhe: detalhe as never, imagem_path: null }).eq("id", q.id).eq("geracao_id", g.id).eq("status", "gerando").select("id");
    if (!saved?.length) return;
    const nextId = await chainGeneration(g, { table: "quadros", id: q.id }, { tentativa: 1, entrada: { ...entrada, prompt, motivo_qc: qc.motivo } as GenerationInput });
    if (nextId) await submitGeneration(nextId, deps.generation);
    return;
  }

  if (await finishFrame(q.id, q.geracao_id, { status: "pronto", qc_aprovado: aprovado, qc_detalhe: detalhe })) await checkAdProgress(cena.anuncio_id);
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
  if (latest.some((l) => l.quadro.status === "pronto")) {
    await transition(anuncioId, "gerando_quadros", "aguardando_aprovacao");
    return;
  }
  if (await transition(anuncioId, "gerando_quadros", "falhou", { erro: "os_3_quadros_falharam" })) await refundAd(anuncioId, "Falha técnica nos 3 quadros do anúncio");
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
