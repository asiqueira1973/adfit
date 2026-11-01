import { NextResponse, type NextRequest } from "next/server";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { createBrand } from "@/server/admin/brands";
import { createBrandSchema } from "@/server/admin/schemas";

/**
 * POST /api/admin/marcas — cria marca (seção 13; matriz da seção 5: só admin).
 * Recebe: JSON com o kit (nome obrigatório; instagram, cor_destaque, cta_padrao, tom_de_voz,
 * idioma_anuncios opcionais). Devolve: 201 { id } ou { erro, mensagem }.
 */
export async function POST(request: NextRequest) {
  const actor = await requireAdminApi();
  if (isResponse(actor)) return actor;
  const parsed = createBrandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error, getDictionary(actor.idioma));
  try {
    return NextResponse.json({ id: await createBrand(parsed.data) }, { status: 201 });
  } catch (e) {
    return errorResponse(e, actor.idioma);
  }
}
