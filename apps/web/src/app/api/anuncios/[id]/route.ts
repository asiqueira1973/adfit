import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isResponse, requireBrandOrAdminApi } from "@/server/api/guards";
import { errorResponse } from "@/server/api/http";
import { getAdView, refreshAd } from "@/server/ads/service";

/**
 * GET /api/anuncios/:id — estado do anúncio para o polling de 5 s da tela (critério 8.5:
 * progresso sem recarregar). Antes de ler, roda a varredura de órfãos e gerações paradas
 * (seções 4.3 e 12.2). Divergência D-20 (rota fora da seção 13). Sem prompt/modelo/custo (seção 5).
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/anuncios/[id]">) {
  const profile = await requireBrandOrAdminApi();
  if (isResponse(profile)) return profile;
  const { id } = await ctx.params;
  try {
    if (!z.string().uuid().safeParse(id).success) throw new Error("anuncio_inexistente");
    await getAdView(profile, id);
    await refreshAd(id);
    const view = await getAdView(profile, id);
    return NextResponse.json({ status: view.status, cenas: view.cenas.map((c) => ({ id: c.id, ordem: c.ordem, quadros: c.quadros.map((q) => ({ id: q.id, status: q.status })) })) });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}

/** Duração máxima da função na Vercel: o trabalho com o Claude/Higgsfield segue depois da resposta. */
export const maxDuration = 300;
