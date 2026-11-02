import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireBrandOrAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { archiveCharacter } from "@/server/characters/service";

const patchSchema = z.object({ arquivado: z.literal(true) }).strict();

/**
 * PATCH /api/personagens/:id — arquivar a personagem (MD-17). Quem: marca (próprias)/admin.
 * Corpo: { arquivado: true }. Recusa com ficha gerando. Anúncios antigos seguem. Devolve: { ok }.
 */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/personagens/[id]">) {
  const profile = await requireBrandOrAdminApi();
  if (isResponse(profile)) return profile;
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error, getDictionary(profile.idioma));
  try {
    if (!z.string().uuid().safeParse(id).success) throw new Error("personagem_inexistente");
    await archiveCharacter(profile, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}
