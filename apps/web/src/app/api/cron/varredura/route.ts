import { NextResponse, type NextRequest } from "next/server";
import { cronAuthorized } from "@/server/cron/auth";
import { sweepActiveAds } from "@/server/ads/service";

/**
 * GET /api/cron/varredura — varredura periódica dos anúncios em andamento (montagem e retentativas
 * sem depender da tela aberta). Chamada a cada 5 min pelo GitHub Actions e 1×/dia pelo cron da
 * Vercel (plano Hobby). Sem sessão (fora do matcher do proxy); protegida por `CRON_SECRET`.
 * Devolve: { verificados }.
 */
export async function GET(request: NextRequest) {
  if (!cronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ erro: "nao_autorizado" }, { status: 401 });
  }
  const verificados = await sweepActiveAds();
  return NextResponse.json({ verificados });
}

/** A montagem com ffmpeg segue depois da resposta (`after`); precisa do tempo máximo. */
export const maxDuration = 300;
