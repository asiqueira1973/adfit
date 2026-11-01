import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireBrandOrAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { redoClip } from "@/server/ads/clips";
import { redoBodySchema } from "@/server/prompts/redo-shortcuts";

const bodySchema = redoBodySchema("clipe");

/**
 * POST /api/cenas/:id/refazer-clipe (seção 13; critérios 8.6/8.7). Quem: marca/admin. Corpo: { instrucao?, atalhos? }.
 * Valida: anúncio `pronto`, ou `aguardando_aprovacao` depois de uma cena falhar. Efeito: debita
 * `refazer_clipe` e gera nova versão do clipe a partir do quadro atual.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/cenas/[id]/refazer-clipe">) {
  const profile = await requireBrandOrAdminApi();
  if (isResponse(profile)) return profile;
  const { id } = await ctx.params;
  const parsed = bodySchema.safeParse((await request.json().catch(() => ({}))) ?? {});
  if (!parsed.success) return validationError(parsed.error, getDictionary(profile.idioma));
  try {
    if (!z.string().uuid().safeParse(id).success) throw new Error("anuncio_inexistente");
    await redoClip(profile, id, parsed.data);
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}

/** Duração máxima da função na Vercel (Claude/Higgsfield/montagem seguem depois da resposta). */
export const maxDuration = 300;
