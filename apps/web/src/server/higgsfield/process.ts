import "server-only";
import { createAdminClient } from "../db/supabase";
import { publicServerEnv, higgsfieldEnv } from "../env";
import { readConfig } from "../config";
import { PHOTO_BUCKET } from "@/lib/storage-paths";
import { createHiggsfieldClient, downloadResult } from "./client";
import { referenceUrls } from "./inputs";
import { buildImageBody, buildVideoBody, type ImageRequest } from "./models";
import type { Downloader, GenerationClient, HfResult } from "./types";
import { buildFramePrompt, frameTarget } from "../ads/frames";
import { clipTarget } from "../ads/clips";

/** Dependências externas da geração (seção 22: dublês nos testes). */
export type GenerationDeps = { hf: GenerationClient; download: Downloader };

let testDeps: GenerationDeps | null = null;

/** Troca as dependências nos testes de integração (nunca usado fora de testes). */
export function setGenerationDepsForTests(deps: GenerationDeps | null): void {
  testDeps = deps;
}

/** Dependências em uso: dublês nos testes, clientes reais no resto. */
export function generationDeps(): GenerationDeps {
  return testDeps ?? { hf: createHiggsfieldClient(), download: downloadResult };
}

/** Entrada gravada em `geracoes.entrada` (sem URLs assinadas — seção 20; elas expiram em 60 min). */
export type GenerationInput = {
  prompt: string;
  prompt_base: string;
  prompt_versao: string;
  referencias: string[];
  aspect_ratio: ImageRequest["aspectRatio"];
  resumo_refacao?: string | null;
  /** Nova tentativa pós-nsfw de quadro: ficha sem o painel do close (bug B-9). */
  sem_close?: boolean;
};

export type GenerationRow = {
  id: string;
  marca_id: string;
  tipo: "ficha_produto" | "quadro_chave" | "clipe_video";
  modelo: string;
  request_id: string | null;
  status: "na_fila" | "processando" | "concluida" | "falhou" | "bloqueada_nsfw";
  entrada: unknown;
  tentativa: number;
  cobranca_id: string | null;
  criado_em: string;
};

const GEN_COLUMNS = "id, marca_id, tipo, modelo, request_id, status, entrada, tentativa, cobranca_id, criado_em";

/** Tentativas por geração: a original + 1 retentativa automática sem cobrança (seção 8.4 e 12). */
export const MAX_ATTEMPTS = 2;

/** URL do webhook com o token (seção 4.3). Só quando o app é público (https); localmente, vale o polling. */
function webhookUrl(): string | undefined {
  const app = publicServerEnv().APP_URL;
  if (!app.startsWith("https://")) return undefined;
  return `${app}/api/webhooks/higgsfield?token=${encodeURIComponent(higgsfieldEnv().HF_WEBHOOK_TOKEN)}`;
}

/** Lê uma geração. */
export async function getGeneration(id: string): Promise<GenerationRow | null> {
  const { data } = await createAdminClient().from("geracoes").select(GEN_COLUMNS).eq("id", id).maybeSingle();
  return (data as GenerationRow | null) ?? null;
}

/** Lê a geração pelo `request_id` da Higgsfield (webhook, seção 13). */
export async function getGenerationByRequestId(requestId: string): Promise<GenerationRow | null> {
  const { data } = await createAdminClient().from("geracoes").select(GEN_COLUMNS).eq("request_id", requestId).maybeSingle();
  return (data as GenerationRow | null) ?? null;
}

/**
 * Submete uma geração `na_fila` à Higgsfield (seção 4.3): monta as URLs de entrada, o corpo do
 * modelo configurado e o `hf_webhook`; grava `request_id` e `processando` (12.3).
 * Erro na submissão segue a política de falha (retentativa ou estorno).
 * Recebe: id da geração e dependências. Devolve: nada.
 */
export async function submitGeneration(geracaoId: string, deps = generationDeps()): Promise<void> {
  const db = createAdminClient();
  const g = await getGeneration(geracaoId);
  if (!g || g.status !== "na_fila") return;
  try {
    const entrada = g.entrada as GenerationInput;
    const imageUrls = await referenceUrls(g.marca_id, entrada.referencias, deps.hf, { dropCloseUp: !!entrada.sem_close });
    const body =
      g.tipo === "clipe_video"
        ? buildVideoBody(g.modelo, { prompt: entrada.prompt, imageUrl: imageUrls[0], seconds: 5 })
        : buildImageBody(g.modelo, { prompt: entrada.prompt, imageUrls, aspectRatio: entrada.aspect_ratio });
    const { request_id } = await deps.hf.submit(g.modelo, body, webhookUrl());
    await db.from("geracoes").update({ request_id, status: "processando" }).eq("id", g.id).eq("status", "na_fila");
  } catch (e) {
    await failGeneration(g, "falhou", `submissao: ${e instanceof Error ? e.message : String(e)}`, deps);
  }
}

/** Extensão e tipo aceitos pelo bucket `produtos` a partir do content-type devolvido. */
function mediaType(contentType: string, tipo: GenerationRow["tipo"]): { ext: string; mime: string } {
  if (tipo === "clipe_video" || contentType.includes("video")) return { ext: "mp4", mime: "video/mp4" };
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return { ext: "jpg", mime: "image/jpeg" };
  if (contentType.includes("webp")) return { ext: "webp", mime: "image/webp" };
  return { ext: "png", mime: "image/png" };
}

/**
 * Alvo de uma geração: a linha que recebe o resultado (`fichas_produto` ou `quadros`, ambas com
 * `geracao_id`, `status = gerando` e `imagem_path`). Cada tipo diz onde gravar o arquivo e o que
 * acontece depois de gravar ou da falha definitiva.
 */
export type GenerationTarget = {
  table: "fichas_produto" | "quadros" | "clipes";
  id: string;
  /** Caminho completo (com bucket) do arquivo do resultado. */
  path(ext: string): string;
  /** Depois de copiar ao Storage (ficha: libera para aprovação; quadro: agenda o QC). */
  afterStored(g: GenerationRow, path: string): Promise<void>;
  /** Depois da falha definitiva (ficha: estorno; quadro: confere o fechamento do anúncio). */
  afterFinalFailure(g: GenerationRow): Promise<void>;
};

/** Acha o alvo da geração pelo `geracao_id` (null se a tentativa já foi substituída). */
async function findTarget(g: GenerationRow): Promise<GenerationTarget | null> {
  if (g.tipo === "ficha_produto") return sheetTarget(g);
  if (g.tipo === "quadro_chave") return frameTarget(g);
  if (g.tipo === "clipe_video") return clipTarget(g);
  throw new Error(`tipo_nao_suportado:${g.tipo}`);
}

/** Alvo `fichas_produto` (épico 8.4). */
async function sheetTarget(g: GenerationRow): Promise<GenerationTarget | null> {
  const db = createAdminClient();
  const { data: ficha } = await db.from("fichas_produto").select("id, produto_id, versao").eq("geracao_id", g.id).maybeSingle();
  if (!ficha) return null;
  return {
    table: "fichas_produto",
    id: ficha.id,
    path: (ext) => `${PHOTO_BUCKET}/${g.marca_id}/${ficha.produto_id}/fichas/v${ficha.versao}-${g.id}.${ext}`,
    // Libera a ficha para aprovação (12.1) — só enquanto ela ainda segue esta geração.
    afterStored: async (_g, path) => {
      await db.from("fichas_produto").update({ imagem_path: path, status: "aguardando_aprovacao" }).eq("id", ficha.id).eq("geracao_id", g.id).eq("status", "gerando");
    },
    // Ficha `falhou` e estorno integral (regra 11.2.4; idempotente por consumo).
    afterFinalFailure: async (gen) => {
      const { data: failed } = await db.from("fichas_produto").update({ status: "falhou" }).eq("id", ficha.id).eq("geracao_id", gen.id).eq("status", "gerando").select("id");
      if (failed?.length && gen.cobranca_id) {
        const { error } = await db.rpc("estornar_creditos", {
          p_movimentacao_id: gen.cobranca_id,
          p_observacao: `Falha técnica na ficha (versão ${ficha.versao})`,
          p_referencia_tipo: "ficha",
          p_referencia_id: ficha.id,
        });
        // `ja_estornado`: outro processo já devolveu — idempotente.
        if (error && error.message !== "ja_estornado") throw error;
      }
    },
  };
}

/** Custo USD de uma geração concluída (seção 7.3): imagem = `preco_usd_por_imagem`; clipe = 5 s × preço/s. */
async function generationCost(g: GenerationRow): Promise<number> {
  const { preco_usd_por_imagem, preco_usd_por_quadro, preco_usd_por_segundo_video } = await readConfig(["preco_usd_por_imagem", "preco_usd_por_quadro", "preco_usd_por_segundo_video"]);
  // Clipe: 5 s × preço por segundo (11.6; MD-4: Seedance 2.5 1080p).
  if (g.tipo === "clipe_video") return Math.round(Number(preco_usd_por_segundo_video) * 5 * 10000) / 10000;
  // Imagem da cena no modelo próprio (MD-12); ficha no modelo de imagem (MD-4).
  return Number(g.tipo === "quadro_chave" ? preco_usd_por_quadro : preco_usd_por_imagem);
}

/**
 * Processa um resultado da Higgsfield — webhook, polling ou "Reconsultar" (seções 4.3 e 13).
 * Idempotente por `request_id`: geração em estado final não muda; a cópia ao Storage usa caminho
 * determinístico (upsert). `completed` → copia o arquivo ao Storage ANTES de liberar o alvo
 * (pegadinha do CLAUDE.md), grava custo e conclui. `failed`/`nsfw` → política de falha.
 * Recebe: geração, resultado e dependências. Devolve: nada.
 */
export async function applyResult(g: GenerationRow, result: HfResult, deps = generationDeps()): Promise<void> {
  if (g.status === "concluida" || g.status === "falhou" || g.status === "bloqueada_nsfw") return;
  const db = createAdminClient();

  if (result.status === "queued" || result.status === "in_progress") {
    if (g.status === "na_fila") await db.from("geracoes").update({ status: "processando" }).eq("id", g.id).eq("status", "na_fila");
    return;
  }
  if (result.status === "nsfw") return failGeneration(g, "bloqueada_nsfw", "nsfw", deps);
  if (result.status !== "completed") return failGeneration(g, "falhou", result.error ?? result.status, deps);

  const url = result.images?.[0]?.url ?? result.video?.url;
  if (!url) return failGeneration(g, "falhou", "resultado_sem_arquivo", deps);

  const custo = await generationCost(g);
  const target = await findTarget(g);
  if (!target) {
    // Resultado atrasado de uma tentativa já substituída (corrida webhook × timeout): a Higgsfield
    // cobrou, então registra o custo, mas não toca o alvo (ele segue a tentativa atual).
    await db
      .from("geracoes")
      .update({ status: "concluida", custo_usd: custo, concluido_em: new Date().toISOString(), erro: "resultado_de_tentativa_substituida" })
      .eq("id", g.id)
      .in("status", ["na_fila", "processando"]);
    return;
  }

  // 1. Copia para o Storage (nunca guardamos só a URL externa — seção 4.3).
  const file = await deps.download(url);
  const { ext, mime } = mediaType(file.contentType, g.tipo);
  const path = target.path(ext);
  const [bucket, ...rest] = path.split("/");
  const { error: upErr } = await db.storage.from(bucket).upload(rest.join("/"), file.bytes, { contentType: mime, upsert: true });
  if (upErr) throw upErr;

  // 2. Segue o fluxo do alvo ANTES de concluir: se a função cair entre os passos, a geração continua
  //    `processando`, o polling reprocessa e os updates condicionais do alvo tornam isso seguro.
  await target.afterStored(g, path);
  // 3. Conclui a geração com o custo real (seção 7.3).
  await db
    .from("geracoes")
    .update({ status: "concluida", resultado_url: path, custo_usd: custo, concluido_em: new Date().toISOString() })
    .eq("id", g.id)
    .in("status", ["na_fila", "processando"]);
}

/**
 * Política de falha técnica (seção 8.4/8.5; 12.1, 12.3 e 12.4): marca a geração como falha (só
 * quem "ganha" a atualização condicional segue — webhook repetido não duplica efeito). Tentativa 1
 * com prompt → nova geração (tentativa 2, mesma cobrança, sem novo débito), ligada ao alvo só se
 * ele ainda segue a tentativa 1. Sem prompt ou na tentativa 2 → falha definitiva do alvo.
 * Recebe: geração, status final, motivo técnico e dependências. Devolve: nada.
 */
export async function failGeneration(
  g: GenerationRow,
  status: "falhou" | "bloqueada_nsfw",
  erro: string,
  deps = generationDeps(),
): Promise<void> {
  const db = createAdminClient();
  const { data: claimed } = await db
    .from("geracoes")
    .update({ status, erro: erro.slice(0, 500), concluido_em: new Date().toISOString() })
    .eq("id", g.id)
    .in("status", ["na_fila", "processando"])
    .select("id");
  if (!claimed?.length) return;

  const target = await findTarget(g);
  if (!target) return;

  // Sem prompt (falhou no preparo, ex.: Claude) não há o que retentar.
  const hasPrompt = !!(g.entrada as GenerationInput | null)?.prompt;
  if (g.tentativa < MAX_ATTEMPTS && hasPrompt) {
    const retryId = await chainGeneration(g, target, { tentativa: g.tentativa + 1, entrada: retryInput(g, status) });
    if (retryId) await submitGeneration(retryId, deps);
    return;
  }
  await target.afterFinalFailure(g);
}

/**
 * Entrada da retentativa: igual à original, exceto quadro barrado por conteúdo (nsfw), que sai com
 * enquadramento aberto e discreto — repetir o mesmo prompt seria barrado de novo (1º teste real) —
 * e com a ficha sem o painel do close, que sozinho dispara o filtro do Grok (bug B-9).
 */
export function retryInput(g: GenerationRow, status: "falhou" | "bloqueada_nsfw"): GenerationInput {
  const entrada = g.entrada as GenerationInput & { prompt_cena?: string; modelo?: string; motivo_qc?: string | null };
  if (status !== "bloqueada_nsfw" || g.tipo !== "quadro_chave" || !entrada.prompt_cena || !entrada.modelo) return entrada;
  return { ...entrada, prompt: buildFramePrompt(entrada.prompt_cena, entrada.modelo, entrada.motivo_qc, true), sem_close: true };
}

/**
 * Cria a próxima geração do mesmo alvo (retentativa técnica ou regeneração do QC) com a mesma
 * cobrança e troca `geracao_id` do alvo só se ele ainda segue `g` e está `gerando`. Se não seguir
 * mais, a nova geração fica `falhou` ("ja_resolvido") e não é submetida.
 * Recebe: geração atual, alvo, tentativa e entrada. Devolve: id da nova geração ou null.
 */
export async function chainGeneration(
  g: GenerationRow,
  target: Pick<GenerationTarget, "table" | "id">,
  next: { tentativa: number; entrada: GenerationInput },
): Promise<string | null> {
  const db = createAdminClient();
  const { data: created, error } = await db
    .from("geracoes")
    .insert({ marca_id: g.marca_id, tipo: g.tipo, modelo: g.modelo, entrada: next.entrada as never, tentativa: next.tentativa, cobranca_id: g.cobranca_id })
    .select("id")
    .single();
  if (error) throw error;
  const { data: linked } = await db
    .from(target.table)
    .update({ geracao_id: created.id })
    .eq("id", target.id)
    .eq("geracao_id", g.id)
    .eq("status", "gerando")
    .select("id");
  if (!linked?.length) {
    await db.from("geracoes").update({ status: "falhou", erro: "alvo_ja_resolvido", concluido_em: new Date().toISOString() }).eq("id", created.id);
    return null;
  }
  return created.id;
}
