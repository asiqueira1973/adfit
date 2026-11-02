import { NextResponse, type NextRequest } from "next/server";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireBrandOrAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { createCharacter, createCharacterSchema } from "@/server/characters/service";

/**
 * POST /api/personagens — cria uma personagem do catálogo (MD-17). Quem: marca/admin. Corpo:
 * { nome, descricao?, genero_modelo, faixa_etaria }. Sem custo (a ficha é cobrada à parte).
 * Devolve: 201 { personagem_id }.
 */
export async function POST(request: NextRequest) {
  const profile = await requireBrandOrAdminApi();
  if (isResponse(profile)) return profile;
  const parsed = createCharacterSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error, getDictionary(profile.idioma));
  try {
    const { personagemId } = await createCharacter(profile, parsed.data);
    return NextResponse.json({ personagem_id: personagemId }, { status: 201 });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}
