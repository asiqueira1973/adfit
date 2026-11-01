import "server-only";
import { createAdminClient } from "../db/supabase";

export type AdStatus = "gerando_roteiro" | "gerando_quadros" | "aguardando_aprovacao" | "gerando_clipes" | "montando" | "pronto" | "falhou";

/**
 * Transições permitidas de `anuncios.status` (seção 12.2). Qualquer volta para `gerando_roteiro` é
 * proibida ("refazer roteiro inteiro = novo anúncio"); nada sai de `falhou`.
 */
export const AD_TRANSITIONS: Record<AdStatus, readonly AdStatus[]> = {
  gerando_roteiro: ["gerando_quadros", "falhou"],
  gerando_quadros: ["aguardando_aprovacao", "falhou"],
  aguardando_aprovacao: ["gerando_clipes"],
  gerando_clipes: ["montando", "aguardando_aprovacao"],
  montando: ["pronto", "montando"],
  pronto: ["gerando_clipes", "montando"],
  falhou: [],
};

/** Diz se a transição é permitida pela 12.2. */
export function canTransition(from: AdStatus, to: AdStatus): boolean {
  return AD_TRANSITIONS[from].includes(to);
}

/** Estados em que a tela bloqueia ações que mudam o anúncio (12.2: "gerando_* ou montando"). */
export function isBusy(status: AdStatus): boolean {
  return status.startsWith("gerando_") || status === "montando";
}

/**
 * Muda o status do anúncio só se ele ainda estiver em `from` (update condicional: dois processos
 * concorrentes não aplicam a mesma transição duas vezes). Recebe: anúncio, de, para e campos extras.
 * Devolve: true se ESTE chamador fez a transição. Lança `transicao_invalida` fora da 12.2.
 */
export async function transition(anuncioId: string, from: AdStatus, to: AdStatus, extra: Record<string, unknown> = {}): Promise<boolean> {
  if (!canTransition(from, to)) throw new Error("transicao_invalida");
  const { data, error } = await createAdminClient()
    .from("anuncios")
    .update({ status: to, ...extra })
    .eq("id", anuncioId)
    .eq("status", from)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
