import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isResponse, requireBrandOrAdminApi } from "@/server/api/guards";
import { errorResponse } from "@/server/api/http";
import { startVideo } from "@/server/ads/clips";

/**
 * POST /api/anuncios/:id/gerar-video (seção 13; critérios 8.6). Quem: marca/admin. Valida: anúncio
 * `aguardando_aprovacao` com os 3 quadros atuais prontos. Efeito: debita `gerar_video` uma vez e
 * submete os 3 clipes de 5 s. Devolve: 202.
 */
export async function POST(_request: NextRequest, ctx: RouteContext<"/api/anuncios/[id]/gerar-video">) {
  const profile = await requireBrandOrAdminApi();
  if (isResponse(profile)) return profile;
  const { id } = await ctx.params;
  try {
    if (!z.string().uuid().safeParse(id).success) throw new Error("anuncio_inexistente");
    await startVideo(profile, id);
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}

/** Duração máxima da função na Vercel: a submissão dos clipes segue depois da resposta. */
export const maxDuration = 300;
