import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireBrandOrAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { saveAdModelAsCharacter } from "@/server/characters/service";

const bodySchema = z.object({ nome: z.string().trim().min(1).max(60) }).strict();

/**
 * POST /api/anuncios/:id/salvar-personagem — salva a modelo do anúncio no catálogo (MD-17): cria a
 * personagem e gera a ficha (2 créditos). Corpo: { nome }. Devolve: 202 { personagem_id }.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/anuncios/[id]/salvar-personagem">) {
  const profile = await requireBrandOrAdminApi();
  if (isResponse(profile)) return profile;
  const { id } = await ctx.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error, getDictionary(profile.idioma));
  try {
    if (!z.string().uuid().safeParse(id).success) throw new Error("anuncio_inexistente");
    const { personagemId } = await saveAdModelAsCharacter(profile, id, parsed.data.nome);
    return NextResponse.json({ personagem_id: personagemId }, { status: 202 });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}

/** Duração máxima: o Claude e a submissão rodam na mesma requisição. */
export const maxDuration = 300;
