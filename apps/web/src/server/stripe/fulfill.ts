import "server-only";
import { createAdminClient } from "../db/supabase";
import { getStripe, type StripeApi } from "./client";

export type FulfillResult =
  | { status: "pago"; pagamentoId: string; marcaId: string; creditos: number; movimentacaoId: string }
  | { status: "pendente" | "falhou" | "expirado"; pagamentoId: string | null; marcaId: string | null }
  | { status: "desconhecido" };

/**
 * Credita uma compra a partir da Checkout Session (seção 4.5, regra 11.2.10).
 * Recebe: id da sessão e (testes) um cliente Stripe alternativo.
 * Faz: busca a sessão na Stripe com `line_items` expandido; localiza o pagamento pelo
 *   `metadata.pagamento_id` e confere que a sessão é a dele e que o Price é o do pacote; se
 *   `payment_status = 'paid'`, chama `creditar_pagamento` — idempotente por Checkout Session
 *   (chamadas repetidas ou simultâneas devolvem a mesma movimentação, sem crédito duplo).
 *   Chamada pelo webhook e pela página /creditos/obrigado; NUNCA a partir de dado do navegador.
 * Devolve: o resultado (pago, pendente, falhou, expirado ou desconhecido).
 */
export async function fulfillCheckout(sessionId: string, stripe: StripeApi = getStripe()): Promise<FulfillResult> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items"] });
  const pagamentoId = session.metadata?.pagamento_id;
  if (!pagamentoId) return { status: "desconhecido" };

  const db = createAdminClient();
  const { data: pag } = await db
    .from("pagamentos")
    .select("id, marca_id, creditos, status, stripe_checkout_session_id, pacotes_creditos(stripe_price_id)")
    .eq("id", pagamentoId)
    .maybeSingle();
  if (!pag || (pag.stripe_checkout_session_id && pag.stripe_checkout_session_id !== session.id)) return { status: "desconhecido" };

  const priceId = session.line_items?.data[0]?.price?.id;
  const expectedPrice = (pag.pacotes_creditos as { stripe_price_id: string } | null)?.stripe_price_id;
  if (priceId && expectedPrice && priceId !== expectedPrice) return { status: "desconhecido" };

  if (pag.status === "falhou" || pag.status === "expirado") return { status: pag.status, pagamentoId: pag.id, marcaId: pag.marca_id };
  if (session.payment_status !== "paid") {
    return { status: session.status === "expired" ? "expirado" : "pendente", pagamentoId: pag.id, marcaId: pag.marca_id };
  }

  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? "");
  const { data: movimentacaoId, error } = await db.rpc("creditar_pagamento", {
    p_pagamento_id: pag.id,
    p_stripe_payment_intent_id: paymentIntent,
    p_valor_centavos: session.amount_total ?? 0,
    p_moeda: session.currency ?? "",
  });
  if (error) throw error;
  return { status: "pago", pagamentoId: pag.id, marcaId: pag.marca_id, creditos: pag.creditos, movimentacaoId };
}
