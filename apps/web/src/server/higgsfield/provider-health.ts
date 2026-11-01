import "server-only";
import { createAdminClient } from "../db/supabase";
import { BusinessError } from "../api/http";

/** Mensagens da Higgsfield para saldo da API esgotado (submissão 403 ou falha da geração). */
const CREDIT_ERROR = /not_enough_credits|credit balance is too low|top up your balance/i;

/** Quanto tempo um erro de saldo, sem nova geração bem-sucedida, mantém o aviso ligado. */
export const OUT_OF_CREDITS_WINDOW_MS = 2 * 3_600_000;

/** Diz se o erro gravado numa geração é falta de saldo da Higgsfield. Recebe: erro. Devolve: boolean. */
export function isProviderCreditError(erro: string | null | undefined): boolean {
  return !!erro && CREDIT_ERROR.test(erro);
}

/**
 * Saldo da Higgsfield esgotado (pedido do Alexandre, 01/11/2026): a geração finalizada mais recente
 * (concluída ou falha) foi um erro de saldo há menos de 2 h. Uma geração concluída depois limpa o
 * aviso. Usado na faixa do admin e para barrar ações cobradas antes de debitar. Recebe: agora.
 * Devolve: boolean.
 */
export async function providerOutOfCredits(now = Date.now()): Promise<boolean> {
  const { data } = await createAdminClient()
    .from("geracoes")
    .select("erro, status, criado_em")
    .in("status", ["concluida", "falhou"])
    .lte("criado_em", new Date(now).toISOString())
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data || data.status !== "falhou" || !isProviderCreditError(data.erro)) return false;
  return now - new Date(data.criado_em).getTime() < OUT_OF_CREDITS_WINDOW_MS;
}

/**
 * Barra uma ação cobrada ANTES do débito quando o saldo da Higgsfield está esgotado: o lojista vê
 * "instabilidade técnica, nada foi cobrado" em vez de pagar, falhar e receber estorno. Recebe: agora.
 * Lança `servico_indisponivel`.
 */
export async function assertProviderAvailable(now = Date.now()): Promise<void> {
  if (await providerOutOfCredits(now)) throw new BusinessError("servico_indisponivel");
}
