import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireBrandOrAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { selectFrame } from "@/server/ads/frames";

const bodySchema = z.object({ quadro_id: z.string().uuid() }).strict();

/**
 * POST /api/cenas/:id/usar-quadro (seção 13). Quem: marca/admin. Corpo: { quadro_id }. Valida: quadro
 * `pronto` da mesma cena e anúncio `aguardando_aprovacao`. Efeito: define `cenas.quadro_atual_id`.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/cenas/[id]/usar-quadro">) {
  const profile = await requireBrandOrAdminApi();
  if (isResponse(profile)) return profile;
  const { id } = await ctx.params;
  const parsed = bodySchema.safeParse((await request.json().catch(() => ({}))) ?? {});
  if (!parsed.success) return validationError(parsed.error, getDictionary(profile.idioma));
  try {
    if (!z.string().uuid().safeParse(id).success) throw new Error("anuncio_inexistente");
    await selectFrame(profile, id, parsed.data.quadro_id);
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}

/** Duração máxima da função na Vercel (Claude/Higgsfield/montagem seguem depois da resposta). */
export const maxDuration = 300;
