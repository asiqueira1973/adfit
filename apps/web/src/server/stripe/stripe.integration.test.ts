import { beforeAll, describe, expect, it } from "vitest";
import Stripe from "stripe";
import type { NextRequest } from "next/server";
import { assertLocalSupabase } from "@/test/local-db";
import { createAdminClient } from "../db/supabase";
import { businessCodeOf } from "../api/http";
import type { Profile } from "../auth/profile";
import type { StripeApi } from "./client";
import { createCheckout } from "./checkout";
import { fulfillCheckout } from "./fulfill";
import { handleStripeEvent, verifyStripeEvent } from "./webhook";

/**
 * Critérios do épico 8.9 (seções 4.5, 12.5 e 22) contra o Supabase local, com um dublê da Stripe
 * no lugar da API real (a parte de rede é testada à mão com `stripe listen` e o cartão 4242).
 */
assertLocalSupabase();
const db = createAdminClient();
const sfx = Date.now().toString(36);
const PRICE = `price_teste_${sfx}`;
let marcaId = "";
let pacoteId = "";
let profile: Profile & { marcaId: string };

/** Dublê da Stripe: grava o que foi criado e devolve sessões configuráveis. */
function fakeStripe(sessions: Record<string, Partial<Stripe.Checkout.Session>>, created: Stripe.Checkout.SessionCreateParams[] = []): StripeApi {
  return {
    checkout: {
      sessions: {
        create: async (params: Stripe.Checkout.SessionCreateParams) => {
          created.push(params);
          const id = `cs_test_${sfx}_${created.length}`;
          sessions[id] = { id, metadata: params.metadata as Stripe.Metadata, payment_status: "unpaid", status: "open" };
          return { id, url: `https://checkout.stripe.com/c/pay/${id}` };
        },
        retrieve: async (id: string) => ({ line_items: { data: [{ price: { id: PRICE } }] }, ...sessions[id] }),
      },
    },
  } as unknown as StripeApi;
}

beforeAll(async () => {
  const { data: marca } = await db.from("marcas").insert({ nome: `Marca stripe ${sfx}` }).select("id").single();
  marcaId = marca!.id;
  const { data: u } = await db.auth.admin.createUser({ email: `compra_${sfx}@kore.test`, password: `x-${sfx}-senha`, email_confirm: true });
  await db.from("perfis").insert({ id: u.user!.id, marca_id: marcaId, nome: "Compradora", email: `compra_${sfx}@kore.test` });
  const { data: pacote } = await db.from("pacotes_creditos").insert({ nome: `Teste ${sfx}`, creditos: 50, preco_centavos: 3000, moeda: "usd", stripe_price_id: PRICE, ativo: true }).select("id").single();
  pacoteId = pacote!.id;
  profile = { id: u.user!.id, nome: "Compradora", email: `compra_${sfx}@kore.test`, papel: "usuario_marca", marcaId, idioma: "pt_br", ativo: true };
});

const saldo = async () => (await db.from("marcas").select("saldo_creditos").eq("id", marcaId).single()).data!.saldo_creditos;

describe("8.9 — checkout", () => {
  it("cria pagamento iniciado e a Checkout Session com client_reference_id, metadata e URLs da 4.5", async () => {
    const created: Stripe.Checkout.SessionCreateParams[] = [];
    const { url, pagamentoId } = await createCheckout(profile, pacoteId, fakeStripe({}, created));
    expect(url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    const p = created[0];
    expect(p.mode).toBe("payment");
    expect(p.line_items).toEqual([{ price: PRICE, quantity: 1 }]);
    expect(p.client_reference_id).toBe(marcaId);
    expect(p.metadata).toEqual({ pagamento_id: pagamentoId, marca_id: marcaId, pacote_id: pacoteId });
    expect(p.success_url).toMatch(/\/creditos\/obrigado\?session_id=\{CHECKOUT_SESSION_ID\}$/);
    expect(p.cancel_url).toMatch(/\/creditos(\?|$)/);
    const { data } = await db.from("pagamentos").select("status, creditos, valor_centavos, moeda, stripe_checkout_session_id").eq("id", pagamentoId).single();
    expect(data).toEqual({ status: "iniciado", creditos: 50, valor_centavos: 3000, moeda: "usd", stripe_checkout_session_id: `cs_test_${sfx}_1` });
  });

  it("marca pausada não consegue comprar", async () => {
    await db.from("marcas").update({ ativa: false }).eq("id", marcaId);
    const err = await createCheckout(profile, pacoteId, fakeStripe({})).catch((e) => e);
    await db.from("marcas").update({ ativa: true }).eq("id", marcaId);
    expect(businessCodeOf(err)).toBe("marca_inativa");
  });
});

describe("8.9 — fulfillCheckout idempotente", () => {
  it("3 chamadas (1 + 2 em paralelo) creditam exatamente os créditos do pacote uma única vez", async () => {
    const sessions: Record<string, Partial<Stripe.Checkout.Session>> = {};
    const stripe = fakeStripe(sessions);
    const antes = await saldo();
    const { pagamentoId } = await createCheckout(profile, pacoteId, stripe);
    const sid = Object.keys(sessions).at(-1)!;
    Object.assign(sessions[sid], { payment_status: "paid", status: "complete", amount_total: 3000, currency: "usd", payment_intent: `pi_${sfx}_1` });

    const first = await fulfillCheckout(sid, stripe);
    const [second, third] = await Promise.all([fulfillCheckout(sid, stripe), fulfillCheckout(sid, stripe)]);
    expect([first.status, second.status, third.status]).toEqual(["pago", "pago", "pago"]);
    const ids = new Set([first, second, third].map((r) => (r.status === "pago" ? r.movimentacaoId : null)));
    expect(ids.size).toBe(1);

    expect(await saldo()).toBe(antes + 50);
    const { data: movs } = await db.from("movimentacoes_creditos").select("tipo, quantidade, saldo_apos, valor_pago_centavos, moeda").eq("pagamento_id", pagamentoId);
    expect(movs).toEqual([{ tipo: "compra", quantidade: 50, saldo_apos: antes + 50, valor_pago_centavos: 3000, moeda: "usd" }]);
    expect((await db.from("pagamentos").select("status").eq("id", pagamentoId).single()).data!.status).toBe("pago");
  });

  it("sessão unpaid não credita", async () => {
    const sessions: Record<string, Partial<Stripe.Checkout.Session>> = {};
    const stripe = fakeStripe(sessions);
    const antes = await saldo();
    await createCheckout(profile, pacoteId, stripe);
    const r = await fulfillCheckout(Object.keys(sessions).at(-1)!, stripe);
    expect(r.status).toBe("pendente");
    expect(await saldo()).toBe(antes);
  });

  it("Price diferente do pacote não credita", async () => {
    const sessions: Record<string, Partial<Stripe.Checkout.Session>> = {};
    const stripe = fakeStripe(sessions);
    await createCheckout(profile, pacoteId, stripe);
    const sid = Object.keys(sessions).at(-1)!;
    Object.assign(sessions[sid], { payment_status: "paid", amount_total: 1, currency: "usd", line_items: { data: [{ price: { id: "price_outro" } }] } });
    const antes = await saldo();
    expect((await fulfillCheckout(sid, stripe)).status).toBe("desconhecido");
    expect(await saldo()).toBe(antes);
  });
});

describe("8.9 — webhook", () => {
  const secret = "whsec_teste_local";
  const real = new Stripe("sk_test_dummy");

  it("assinatura inválida é rejeitada e válida é aceita", () => {
    const payload = JSON.stringify({ id: "evt_1", object: "event", type: "checkout.session.expired", data: { object: {} } });
    expect(() => verifyStripeEvent(payload, "t=1,v1=deadbeef", secret, real)).toThrow();
    expect(() => verifyStripeEvent(payload, null, secret, real)).toThrow();
    const header = real.webhooks.generateTestHeaderString({ payload, secret });
    expect(verifyStripeEvent(payload, header, secret, real).id).toBe("evt_1");
  });

  it("rota responde 400 com assinatura inválida e não altera nada", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const antes = await saldo();
    const res = await POST(new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: "{}", headers: { "stripe-signature": "t=1,v1=00" } }) as unknown as NextRequest);
    expect(res.status).toBe(400);
    expect(await saldo()).toBe(antes);
  });

  it("expired → expirado; async_payment_failed → falhou; nenhum crédito; estados finais não mudam", async () => {
    const stripe = fakeStripe({});
    const a = await createCheckout(profile, pacoteId, stripe);
    const b = await createCheckout(profile, pacoteId, stripe);
    const antes = await saldo();
    await handleStripeEvent({ type: "checkout.session.expired", data: { object: { id: "cs_x", metadata: { pagamento_id: a.pagamentoId } } } } as unknown as Stripe.Event, stripe);
    await handleStripeEvent({ type: "checkout.session.async_payment_failed", data: { object: { id: "cs_y", metadata: { pagamento_id: b.pagamentoId } } } } as unknown as Stripe.Event, stripe);
    await handleStripeEvent({ type: "checkout.session.expired", data: { object: { id: "cs_y", metadata: { pagamento_id: b.pagamentoId } } } } as unknown as Stripe.Event, stripe);
    const st = async (id: string) => (await db.from("pagamentos").select("status").eq("id", id).single()).data!.status;
    expect(await st(a.pagamentoId)).toBe("expirado");
    expect(await st(b.pagamentoId)).toBe("falhou");
    expect(await saldo()).toBe(antes);
  });

  it("charge.refunded total gera ajuste negativo limitado ao saldo; parcial só registra", async () => {
    const sessions: Record<string, Partial<Stripe.Checkout.Session>> = {};
    const stripe = fakeStripe(sessions);
    const { pagamentoId } = await createCheckout(profile, pacoteId, stripe);
    const sid = Object.keys(sessions).at(-1)!;
    Object.assign(sessions[sid], { payment_status: "paid", amount_total: 3000, currency: "usd", payment_intent: `pi_${sfx}_refund` });
    await fulfillCheckout(sid, stripe);
    // Gasta tudo menos 20 créditos para o reembolso não caber inteiro no saldo.
    await db.rpc("lancar_creditos", { p_marca_id: marcaId, p_tipo: "ajuste_manual", p_quantidade: -((await saldo()) - 20), p_valor_pago_centavos: null as unknown as number, p_observacao: "consumo simulado", p_criado_por: null as unknown as string });

    const parcial = { type: "charge.refunded", data: { object: { payment_intent: `pi_${sfx}_refund`, amount: 3000, amount_refunded: 1000, currency: "usd" } } } as unknown as Stripe.Event;
    expect(await handleStripeEvent(parcial, stripe)).toBe("reembolso_parcial");
    expect(await saldo()).toBe(20);

    const total = { type: "charge.refunded", data: { object: { payment_intent: `pi_${sfx}_refund`, amount: 3000, amount_refunded: 3000, currency: "usd" } } } as unknown as Stripe.Event;
    expect(await handleStripeEvent(total, stripe)).toBe("reembolsado");
    expect(await handleStripeEvent(total, stripe)).toBe("reembolsado");
    expect(await saldo()).toBe(0);
    const { data: pag } = await db.from("pagamentos").select("status, observacao").eq("id", pagamentoId).single();
    expect(pag!.status).toBe("reembolsado");
    expect(pag!.observacao).toMatch(/Reembolso parcial/);
    expect(pag!.observacao).toMatch(/diferença de 30 créditos/);
  });
});
