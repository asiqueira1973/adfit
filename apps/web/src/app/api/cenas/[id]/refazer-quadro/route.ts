import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireBrandOrAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { redoFrame } from "@/server/ads/frames";
import { redoBodySchema } from "@/server/prompts/redo-shortcuts";

const bodySchema = redoBodySchema("quadro");

/**
 * POST /api/cenas/:id/refazer-quadro (seção 13; critério 8.6). Quem: marca/admin. Corpo: { instrucao? ≤ 200, atalhos? }.
 * Valida: anúncio `aguardando_aprovacao`. Efeito: debita `refazer_quadro` (grátis se a cena só falhou,
 * D-18) e gera uma nova versão do quadro com a instrução traduzida pelo Claude (C.3).
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/cenas/[id]/refazer-quadro">) {
  const profile = await requireBrandOrAdminApi();
  if (isResponse(profile)) return profile;
  const { id } = await ctx.params;
  const parsed = bodySchema.safeParse((await request.json().catch(() => ({}))) ?? {});
  if (!parsed.success) return validationError(parsed.error, getDictionary(profile.idioma));
  try {
    if (!z.string().uuid().safeParse(id).success) throw new Error("anuncio_inexistente");
    await redoFrame(profile, id, parsed.data);
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}

/** Duração máxima da função na Vercel (Claude/Higgsfield/montagem seguem depois da resposta). */
export const maxDuration = 300;
