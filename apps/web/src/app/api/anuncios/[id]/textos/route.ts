import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireBrandOrAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { patchAdTexts, patchTextsSchema } from "@/server/ads/service";

/**
 * PATCH /api/anuncios/:id/textos — edita o texto da tela das cenas e a oferta (seção 13; critério
 * 8.5; limites da 11.7). Quem: marca/admin. Valida: anúncio da marca em `aguardando_aprovacao`
 * (em `pronto`, a remontagem grátis entra no 8.7). Termo proibido digitado não bloqueia: vem em
 * `avisos`. Devolve: { avisos: [cena_id] }.
 */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/anuncios/[id]/textos">) {
  const profile = await requireBrandOrAdminApi();
  if (isResponse(profile)) return profile;
  const { id } = await ctx.params;
  const parsed = patchTextsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error, getDictionary(profile.idioma));
  try {
    if (!z.string().uuid().safeParse(id).success) throw new Error("anuncio_inexistente");
    return NextResponse.json(await patchAdTexts(profile, id, parsed.data));
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}

/** Duração máxima da função na Vercel: a remontagem (texto editado no vídeo pronto) segue depois da resposta. */
export const maxDuration = 300;
