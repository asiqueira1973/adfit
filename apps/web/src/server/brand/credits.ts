import "server-only";
import { createUserClient } from "../db/supabase";

/**
 * Extrato de créditos da própria marca (tela [Marca] Créditos; critério 8.8/8.9: compras mostram
 * valor e moeda, saldo após correto). Lê com a sessão do usuário (RLS movimentacoes_select).
 * Recebe: id da marca. Devolve: movimentações mais recentes primeiro.
 */
export async function listBrandLedger(marcaId: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("movimentacoes_creditos")
    .select("id, criado_em, tipo, acao, quantidade, saldo_apos, valor_pago_centavos, moeda, observacao, referencia_tipo, referencia_id")
    .eq("marca_id", marcaId)
    .order("criado_em", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

/** Preço em créditos de cada ação (regra 11.1), para a tabela "Quanto custa cada ação". */
export async function listActionPrices() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.from("precos_acoes").select("acao, creditos, descricao");
  if (error) throw error;
  const order = ["gerar_ficha", "refazer_ficha", "gerar_roteiro_quadros", "refazer_quadro", "gerar_video", "refazer_clipe", "remontar_texto"];
  return (data ?? []).sort((a, b) => order.indexOf(a.acao) - order.indexOf(b.acao));
}

/** Histórico de pagamentos da própria marca (tela Créditos). */
export async function listBrandPayments(marcaId: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("pagamentos")
    .select("id, criado_em, creditos, valor_centavos, moeda, status, pacotes_creditos(nome)")
    .eq("marca_id", marcaId)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p) => ({ ...p, pacote: (p.pacotes_creditos as { nome: string } | null)?.nome ?? "" }));
}

/**
 * Pacotes à venda (critério 8.9): só `ativo = true` (a RLS pacotes_select já filtra para a marca),
 * na ordem de `ordem`. Recebe: nada. Devolve: os pacotes.
 */
export async function listActivePackages() {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("pacotes_creditos")
    .select("id, nome, creditos, preco_centavos, moeda, ordem")
    .eq("ativo", true)
    .order("ordem")
    .order("creditos");
  if (error) throw error;
  return data ?? [];
}
