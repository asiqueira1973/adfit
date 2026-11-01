import "server-only";
import { createAdminClient } from "./db/supabase";

/** Chaves de `configuracoes` usadas pelo servidor (regra 11.6 + MD-3/MD-4). */
export type ConfigKey =
  | "modelo_imagem"
  | "modelo_quadro"
  | "preco_usd_por_quadro"
  | "modelo_video"
  | "resolucao_video"
  | "preco_usd_por_segundo_video"
  | "preco_usd_por_imagem"
  | "modelo_claude_roteiro"
  | "modelo_claude_qc"
  | "modelo_claude_qc_texto";

/**
 * Lê valores de `configuracoes` no momento do uso (seção 7: nenhum endpoint ID fixo no código;
 * trocar de modelo sem deploy). Recebe: as chaves. Devolve: { chave: valor } (JSON já decodificado).
 * Lança `configuracao_ausente` se alguma chave não existir.
 */
export async function readConfig<K extends ConfigKey>(keys: K[]): Promise<Record<K, unknown>> {
  const { data, error } = await createAdminClient().from("configuracoes").select("chave, valor").in("chave", keys);
  if (error) throw error;
  const out = {} as Record<K, unknown>;
  for (const k of keys) {
    const row = data?.find((r) => r.chave === k);
    if (!row) throw new Error(`configuracao_ausente:${k}`);
    out[k] = row.valor;
  }
  return out;
}
