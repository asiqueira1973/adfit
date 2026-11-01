import "server-only";
import Stripe from "stripe";
import { stripeEnv } from "../env";

let cached: Stripe | null = null;

/**
 * Cliente da Stripe com a chave secreta do servidor (seção 4.5; nada de cartão passa por nós).
 * Recebe: nada. Devolve: o cliente (instância única por processo).
 */
export function getStripe(): Stripe {
  if (!cached) cached = new Stripe(stripeEnv().STRIPE_SECRET_KEY);
  return cached;
}

/** Subconjunto da API da Stripe usado pelo AdFit — permite dublês nos testes (seção 22). */
export type StripeApi = Pick<Stripe, "checkout" | "prices" | "webhooks" | "charges">;
