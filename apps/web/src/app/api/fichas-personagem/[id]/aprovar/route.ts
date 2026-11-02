import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isResponse, requireBrandOrAdminApi } from "@/server/api/guards";
import { errorResponse } from "@/server/api/http";
import { approveCharacterSheet } from "@/server/characters/service";

/** POST /api/fichas-personagem/:id/aprovar — aprova a versão da ficha de personagem (MD-17). Sem custo. */
export async function POST(_request: NextRequest, ctx: RouteContext<"/api/fichas-personagem/[id]/aprovar">) {
  const profile = await requireBrandOrAdminApi();
  if (isResponse(profile)) return profile;
  const { id } = await ctx.params;
  try {
    if (!z.string().uuid().safeParse(id).success) throw new Error("ficha_inexistente");
    const { personagemId } = await approveCharacterSheet(profile, id);
    return NextResponse.json({ personagem_id: personagemId });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}
