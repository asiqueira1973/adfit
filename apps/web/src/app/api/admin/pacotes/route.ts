import { NextResponse, type NextRequest } from "next/server";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { createPackage, packageSchema } from "@/server/admin/settings";

/**
 * POST /api/admin/pacotes — cria pacote de créditos (seção 13; critério 8.9).
 * Recebe: { nome, creditos, preco_centavos, moeda, stripe_price_id, ativo, ordem }.
 * Valida: o Price existe na Stripe e moeda/valor batem. Devolve: 201 { id } ou { erro, mensagem }.
 */
export async function POST(request: NextRequest) {
  const actor = await requireAdminApi();
  if (isResponse(actor)) return actor;
  const parsed = packageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error, getDictionary(actor.idioma));
  try {
    return NextResponse.json({ id: await createPackage(parsed.data) }, { status: 201 });
  } catch (e) {
    return errorResponse(e, actor.idioma);
  }
}
