import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isResponse, requireBrandOrAdminApi } from "@/server/api/guards";
import { errorResponse } from "@/server/api/http";
import { downloadAd } from "@/server/ads/service";

/**
 * GET /api/anuncios/:id/download (seção 13; critério 8.7). Quem: marca/admin. Valida: anúncio da marca
 * com vídeo montado. Efeito: redireciona para a URL assinada (60 min) que baixa com o nome da regra 8.7.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/anuncios/[id]/download">) {
  const profile = await requireBrandOrAdminApi();
  if (isResponse(profile)) return profile;
  const { id } = await ctx.params;
  try {
    if (!z.string().uuid().safeParse(id).success) throw new Error("anuncio_inexistente");
    const { url } = await downloadAd(profile, id);
    return NextResponse.redirect(url, 302);
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}
