import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireBrandOrAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { selectClip } from "@/server/ads/clips";

const bodySchema = z.object({ clipe_id: z.string().uuid() }).strict();

/**
 * POST /api/cenas/:id/usar-clipe (seção 13; critério 8.7). Quem: marca/admin. Corpo: { clipe_id }. Valida:
 * clipe `pronto` da mesma cena e anúncio `pronto`. Efeito: define `clipe_atual_id` e remonta grátis.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/cenas/[id]/usar-clipe">) {
  const profile = await requireBrandOrAdminApi();
  if (isResponse(profile)) return profile;
  const { id } = await ctx.params;
  const parsed = bodySchema.safeParse((await request.json().catch(() => ({}))) ?? {});
  if (!parsed.success) return validationError(parsed.error, getDictionary(profile.idioma));
  try {
    if (!z.string().uuid().safeParse(id).success) throw new Error("anuncio_inexistente");
    await selectClip(profile, id, parsed.data.clipe_id);
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}

/** Duração máxima da função na Vercel (Claude/Higgsfield/montagem seguem depois da resposta). */
export const maxDuration = 300;
