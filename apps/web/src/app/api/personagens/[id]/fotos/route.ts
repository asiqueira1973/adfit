import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireBrandOrAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { addCharacterPhotos } from "@/server/characters/service";

const bodySchema = z.object({ paths: z.array(z.string().max(300)).min(1).max(4) }).strict();

/**
 * POST /api/personagens/:id/fotos — registra fotos de referência já enviadas ao Storage (MD-17).
 * Quem: marca/admin. Corpo: { paths } na pasta da personagem. Até 4. Devolve: { ok }.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/personagens/[id]/fotos">) {
  const profile = await requireBrandOrAdminApi();
  if (isResponse(profile)) return profile;
  const { id } = await ctx.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error, getDictionary(profile.idioma));
  try {
    if (!z.string().uuid().safeParse(id).success) throw new Error("personagem_inexistente");
    await addCharacterPhotos(profile, id, parsed.data.paths);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}
