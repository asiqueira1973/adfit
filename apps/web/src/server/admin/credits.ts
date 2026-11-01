import "server-only";
import { createAdminClient, createUserClient } from "../db/supabase";
import type { LaunchCreditsInput } from "./schemas";

/**
 * Lança compra/bônus/ajuste (POST /api/admin/creditos; critério 8.2, regra 11.2.6) via
 * `lancar_creditos`. As validações (valor pago na compra, observação em bônus/ajuste, saldo não
 * negativo) ficam na função do banco; os erros sobem com o código (`saldo_negativo`…).
 * Recebe: dados validados e o id do admin. Devolve: id da movimentação.
 */
export async function launchCredits(input: LaunchCreditsInput, actorId: string): Promise<string> {
  const { data, error } = await createAdminClient().rpc("lancar_creditos", {
    p_marca_id: input.marca_id,
    p_tipo: input.tipo,
    p_quantidade: input.quantidade,
    p_valor_pago_centavos: input.valor_pago_centavos ?? (null as unknown as number),
    p_observacao: input.observacao ?? (null as unknown as string),
    p_criado_por: actorId,
    p_moeda: input.moeda ?? undefined,
  });
  if (error) throw error;
  return data;
}

export type LedgerRow = {
  id: string;
  criadoEm: string;
  tipo: "compra" | "bonus" | "consumo" | "estorno" | "ajuste_manual";
  acao: string | null;
  quantidade: number;
  saldoApos: number;
  valorPagoCentavos: number | null;
  moeda: string | null;
  observacao: string | null;
  referenciaTipo: string | null;
  referenciaId: string | null;
};

/**
 * Extrato de créditos de uma marca (aba Extrato do admin; critério 8.2 "o extrato mostra a linha
 * com saldo_apos"). Recebe: id da marca. Devolve: movimentações mais recentes primeiro.
 */
export async function listLedger(marcaId: string): Promise<LedgerRow[]> {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("movimentacoes_creditos")
    .select("id, criado_em, tipo, acao, quantidade, saldo_apos, valor_pago_centavos, moeda, observacao, referencia_tipo, referencia_id")
    .eq("marca_id", marcaId)
    .order("criado_em", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((m) => ({
    id: m.id,
    criadoEm: m.criado_em,
    tipo: m.tipo,
    acao: m.acao,
    quantidade: m.quantidade,
    saldoApos: m.saldo_apos,
    valorPagoCentavos: m.valor_pago_centavos,
    moeda: m.moeda,
    observacao: m.observacao,
    referenciaTipo: m.referencia_tipo,
    referenciaId: m.referencia_id,
  }));
}

/**
 * Pagamentos da Stripe de uma marca (aba Pagamentos do admin, critério 8.9).
 * Recebe: id da marca. Devolve: pagamentos com o nome do pacote, mais recentes primeiro.
 */
export async function listPayments(marcaId: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("pagamentos")
    .select("id, criado_em, creditos, valor_centavos, moeda, status, observacao, pacotes_creditos(nome)")
    .eq("marca_id", marcaId)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p) => ({ ...p, pacote: (p.pacotes_creditos as { nome: string } | null)?.nome ?? "" }));
}
