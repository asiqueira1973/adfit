import "server-only";
import { createAdminClient } from "../db/supabase";
import { publicServerEnv } from "../env";
import { BusinessError } from "../api/http";
import type { Profile } from "../auth/profile";
import { getStripe, type StripeApi } from "./client";

/**
 * Cria a compra de um pacote (POST /api/creditos/checkout; seção 4.5 e critério 8.9).
 * Recebe: o perfil do usuário da marca, o pacote e (testes) um cliente Stripe alternativo.
 * Valida: pacote ativo (`pacote_inexistente`) e marca ativa (`marca_inativa`, seção 6.3).
 * Faz: insere `pagamentos` com status `iniciado` e créditos/valor/moeda congelados; cria a Checkout
 *   Session hospedada (`mode=payment`, um item, `client_reference_id = marca_id`, `metadata =
 *   { pagamento_id, marca_id, pacote_id }`, success_url `/creditos/obrigado?session_id=…`,
 *   cancel_url `/creditos`); grava `stripe_checkout_session_id`.
 * Devolve: { url } da página da Stripe.
 */
export async function createCheckout(profile: Profile & { marcaId: string }, pacoteId: string, stripe: StripeApi = getStripe()): Promise<{ url: string; pagamentoId: string }> {
  const db = createAdminClient();
  const [{ data: pacote }, { data: marca }] = await Promise.all([
    db.from("pacotes_creditos").select("id, nome, creditos, preco_centavos, moeda, stripe_price_id, ativo").eq("id", pacoteId).maybeSingle(),
    db.from("marcas").select("id, ativa").eq("id", profile.marcaId).single(),
  ]);
  if (!pacote || !pacote.ativo) throw new BusinessError("pacote_inexistente");
  if (!marca?.ativa) throw new BusinessError("marca_inativa");

  const { data: pagamento, error } = await db
    .from("pagamentos")
    .insert({ marca_id: profile.marcaId, pacote_id: pacote.id, criado_por: profile.id, creditos: pacote.creditos, valor_centavos: pacote.preco_centavos, moeda: pacote.moeda })
    .select("id")
    .single();
  if (error) throw error;

  const appUrl = publicServerEnv().APP_URL;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: pacote.stripe_price_id, quantity: 1 }],
    client_reference_id: profile.marcaId,
    metadata: { pagamento_id: pagamento.id, marca_id: profile.marcaId, pacote_id: pacote.id },
    customer_email: profile.email,
    locale: profile.idioma === "en" ? "en" : "pt-BR",
    success_url: `${appUrl}/creditos/obrigado?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/creditos?compra=cancelada`,
  });

  await db.from("pagamentos").update({ stripe_checkout_session_id: session.id }).eq("id", pagamento.id);
  if (!session.url) throw new Error("Checkout Session sem URL");
  return { url: session.url, pagamentoId: pagamento.id };
}
