import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "../db/supabase";
import { stripeEnv } from "../env";
import { fulfillCheckout } from "./fulfill";
import { getStripe, type StripeApi } from "./client";

/**
 * Verifica a assinatura do webhook sobre o CORPO BRUTO (seção 4.5; pegadinha do CLAUDE.md).
 * Recebe: corpo bruto, cabeçalho `stripe-signature` e (testes) segredo/cliente alternativos.
 * Devolve: o evento validado; lança erro se a assinatura não bate.
 */
export function verifyStripeEvent(rawBody: string, signature: string | null, secret = stripeEnv().STRIPE_WEBHOOK_SECRET, stripe: StripeApi = getStripe()): Stripe.Event {
  if (!signature || !secret) throw new Error("assinatura_ausente");
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

/**
 * Trata um evento já verificado (seção 4.5, máquina 12.5). Idempotente: reenvios não mudam nada.
 * - checkout.session.completed / async_payment_succeeded → fulfillCheckout (credita se `paid`).
 * - checkout.session.async_payment_failed → pagamento `iniciado` vira `falhou`.
 * - checkout.session.expired → pagamento `iniciado` vira `expirado`.
 * - charge.refunded → reembolso total: `estornar_pagamento` (ajuste negativo até o saldo);
 *   parcial: só registra em `pagamentos.observacao` para o admin (regra 11.2.10).
 * Recebe: o evento e (testes) cliente Stripe. Devolve: um rótulo do que foi feito (para log).
 */
export async function handleStripeEvent(event: Stripe.Event, stripe: StripeApi = getStripe()): Promise<string> {
  const db = createAdminClient();
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const r = await fulfillCheckout(event.data.object.id, stripe);
      return `fulfill:${r.status}`;
    }
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const pagamentoId = event.data.object.metadata?.pagamento_id;
      if (!pagamentoId) return "ignorado:sem_pagamento";
      const status = event.type === "checkout.session.expired" ? "expirado" : "falhou";
      // Só sai de `iniciado` (12.5: falhou/expirado/reembolsado são finais; pago não volta).
      await db.from("pagamentos").update({ status }).eq("id", pagamentoId).eq("status", "iniciado");
      return status;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (!pi) return "ignorado:sem_payment_intent";
      const { data: pag } = await db.from("pagamentos").select("id, status, observacao").eq("stripe_payment_intent_id", pi).maybeSingle();
      if (!pag) return "ignorado:pagamento_desconhecido";
      if (charge.amount_refunded >= charge.amount) {
        const { error } = await db.rpc("estornar_pagamento", { p_pagamento_id: pag.id });
        if (error && error.message !== "transicao_invalida") throw error;
        return "reembolsado";
      }
      const nota = `Reembolso parcial na Stripe: ${charge.amount_refunded} de ${charge.amount} centavos (${charge.currency}); créditos não alterados.`;
      if (!pag.observacao?.includes(nota)) {
        await db.from("pagamentos").update({ observacao: [pag.observacao, nota].filter(Boolean).join(" ") }).eq("id", pag.id);
      }
      return "reembolso_parcial";
    }
    default:
      return `ignorado:${event.type}`;
  }
}
