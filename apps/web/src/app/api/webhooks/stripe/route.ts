import { NextResponse, type NextRequest } from "next/server";
import { handleStripeEvent, verifyStripeEvent } from "@/server/stripe/webhook";

/**
 * POST /api/webhooks/stripe — eventos da Stripe (seções 4.5 e 13).
 * Lê o CORPO BRUTO (sem parse de JSON) e verifica a assinatura com STRIPE_WEBHOOK_SECRET:
 * inválida → 400 sem efeito algum. Válida → trata o evento (idempotente) e responde 200.
 * Erro inesperado no tratamento → 500, para a Stripe reenviar.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  let event;
  try {
    event = verifyStripeEvent(raw, request.headers.get("stripe-signature"));
  } catch {
    return NextResponse.json({ erro: "assinatura_invalida", mensagem: "Assinatura inválida." }, { status: 400 });
  }
  try {
    const result = await handleStripeEvent(event);
    console.info(`stripe webhook ${event.id} ${event.type} → ${result}`);
    return NextResponse.json({ recebido: true });
  } catch (e) {
    console.error(`stripe webhook ${event.id} ${event.type} falhou:`, e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "erro_interno", mensagem: "Falha ao processar o evento." }, { status: 500 });
  }
}
