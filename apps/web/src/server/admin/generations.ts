import "server-only";
import { createAdminClient } from "../db/supabase";

export type GenerationFilter = { tipo?: string | null; status?: string | null; marcaId?: string | null };

const TIPOS = ["ficha_produto", "quadro_chave", "clipe_video"] as const;
const STATUS = ["na_fila", "processando", "concluida", "falhou", "bloqueada_nsfw"] as const;
/** Quantas gerações a lista mostra (as mais recentes). */
export const GENERATIONS_LIMIT = 200;

/**
 * [Admin] Gerações (critério 8.8): as mais recentes, filtráveis por tipo, status e marca, com o nome
 * da marca. Valores de filtro fora do enum são ignorados. Recebe: filtro. Devolve: linhas.
 */
export async function listGenerations(filter: GenerationFilter) {
  let q = createAdminClient()
    .from("geracoes")
    .select("id, criado_em, marca_id, tipo, modelo, status, tentativa, custo_usd, marcas(nome)")
    .order("criado_em", { ascending: false })
    .limit(GENERATIONS_LIMIT);
  if (filter.tipo && (TIPOS as readonly string[]).includes(filter.tipo)) q = q.eq("tipo", filter.tipo as (typeof TIPOS)[number]);
  if (filter.status && (STATUS as readonly string[]).includes(filter.status)) q = q.eq("status", filter.status as (typeof STATUS)[number]);
  if (filter.marcaId) q = q.eq("marca_id", filter.marcaId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((g) => ({ ...g, marca: (g.marcas as unknown as { nome: string } | null)?.nome ?? "—", custo_usd: g.custo_usd === null ? null : Number(g.custo_usd) }));
}

/**
 * Detalhe de uma geração: entrada, erro, request_id, custo e URL assinada (1 h) do resultado no
 * Storage — só se o caminho estiver na pasta da marca dona (service role ignora as políticas).
 * Recebe: id. Devolve: a geração ou null.
 */
export async function getGenerationDetail(id: string) {
  const db = createAdminClient();
  const { data: g } = await db
    .from("geracoes")
    .select("id, criado_em, concluido_em, marca_id, tipo, modelo, status, tentativa, custo_usd, request_id, erro, entrada, resultado_url, marcas(nome)")
    .eq("id", id)
    .maybeSingle();
  if (!g) return null;
  let resultado: string | null = null;
  const [bucket, ...rest] = (g.resultado_url ?? "").split("/");
  const object = rest.join("/");
  if (g.resultado_url && (bucket === "produtos" || bucket === "anuncios") && object.startsWith(`${g.marca_id}/`)) {
    const { data } = await db.storage.from(bucket).createSignedUrl(object, 3600);
    resultado = data?.signedUrl ?? null;
  }
  return { ...g, marca: (g.marcas as unknown as { nome: string } | null)?.nome ?? "—", custo_usd: g.custo_usd === null ? null : Number(g.custo_usd), resultado };
}
