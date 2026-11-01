import "server-only";
import { createAdminClient } from "../db/supabase";
import { applyResult, failGeneration, generationDeps, getGeneration } from "./process";

/** Polling de reserva (seção 4.3): só para gerações paradas há mais de 3 min, no máximo a cada 30 s. */
export const STALE_AFTER_MS = 3 * 60_000;
export const POLL_EVERY_MS = 30_000;
/** Geração `na_fila` sem `request_id` há mais de 6 min: a função que a criou foi encerrada antes
 *  de submeter (acima da duração máxima de uma função na Vercel) → política de falha/estorno. */
export const ORPHAN_AFTER_MS = 6 * 60_000;
/** Sem webhook nem resposta no polling há mais de 15 min → `falhou` por timeout (12.3). */
export const TIMEOUT_MS = 15 * 60_000;

const lastPolled = new Map<string, number>();

/**
 * Reconsulta uma geração na Higgsfield e processa o resultado como se fosse o webhook (seção 13,
 * "Reconsultar" do admin e polling de reserva). Timeout de 15 min → política de falha.
 * Recebe: id da geração e `force` (admin ignora o intervalo de 30 s). Devolve: o status final lido.
 */
export async function reconsultGeneration(geracaoId: string, { force = false, now = Date.now() } = {}): Promise<string | null> {
  const g = await getGeneration(geracaoId);
  if (!g) return null;
  if (g.status !== "na_fila" && g.status !== "processando") return g.status;
  const deps = generationDeps();
  const age = now - new Date(g.criado_em).getTime();

  if (!force && now - (lastPolled.get(g.id) ?? 0) < POLL_EVERY_MS) return g.status;
  lastPolled.set(g.id, now);

  if (g.request_id) {
    try {
      const result = await deps.hf.status(g.request_id);
      await applyResult(g, result, deps);
      const after = await getGeneration(g.id);
      if (after && (after.status === "concluida" || after.status === "falhou" || after.status === "bloqueada_nsfw")) return after.status;
    } catch (e) {
      console.error("Polling da Higgsfield falhou:", e instanceof Error ? e.message : e);
    }
  }
  if (!g.request_id && g.status === "na_fila" && age > ORPHAN_AFTER_MS) {
    await failGeneration(g, "falhou", "orfa_sem_submissao", deps);
    return (await getGeneration(g.id))?.status ?? "falhou";
  }
  if (age > TIMEOUT_MS) {
    await failGeneration(g, "falhou", "timeout_15min", deps);
    return "falhou";
  }
  return g.status;
}

/**
 * Varre gerações `na_fila`/`processando` paradas há mais de 3 min de uma marca (ou de uma lista)
 * e reconsulta cada uma (seção 4.3; divergência D-15: chamada pelo polling da tela até o worker
 * do 8.6 assumir a varredura periódica). Recebe: filtro. Devolve: quantas foram reconsultadas.
 */
export async function refreshStaleGenerations(filter: { geracaoIds: string[] }, now = Date.now()): Promise<number> {
  if (!filter.geracaoIds.length) return 0;
  const cutoff = new Date(now - STALE_AFTER_MS).toISOString();
  const { data } = await createAdminClient()
    .from("geracoes")
    .select("id")
    .in("id", filter.geracaoIds)
    .in("status", ["na_fila", "processando"])
    .lt("criado_em", cutoff);
  for (const row of data ?? []) await reconsultGeneration(row.id, { now });
  return data?.length ?? 0;
}
