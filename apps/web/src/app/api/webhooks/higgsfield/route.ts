import { NextResponse, type NextRequest } from "next/server";
import { handleHiggsfieldWebhook } from "@/server/higgsfield/webhook";

/**
 * POST /api/webhooks/higgsfield?token= — resultado das gerações (seções 4.3 e 13). Sem sessão
 * (fora do matcher do proxy); protegido pelo token em tempo constante e, se configurada, pela
 * assinatura Standard Webhooks. Lê o corpo bruto. Idempotente por `request_id`.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  const { status, body } = await handleHiggsfieldWebhook(request.nextUrl.searchParams.get("token"), request.headers, raw);
  return NextResponse.json(body, { status });
}

/** Duração máxima da função na Vercel: o trabalho com o Claude/Higgsfield segue depois da resposta. */
export const maxDuration = 300;
