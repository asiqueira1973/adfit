import { NextResponse, type NextRequest } from "next/server";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { launchCredits } from "@/server/admin/credits";
import { launchCreditsSchema } from "@/server/admin/schemas";

/**
 * POST /api/admin/creditos — lançamento manual (seção 13, regra 11.2.6, critério 8.2).
 * Recebe: { marca_id, tipo, quantidade, valor_pago_centavos?, moeda?, observacao? }.
 * Faz: `lancar_creditos`. Devolve: 201 { id } ou { erro, mensagem } — ajuste que deixaria saldo < 0
 * responde 422 "O ajuste deixaria o saldo negativo." (seção 15).
 */
export async function POST(request: NextRequest) {
  const actor = await requireAdminApi();
  if (isResponse(actor)) return actor;
  const parsed = launchCreditsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error, getDictionary(actor.idioma));
  try {
    return NextResponse.json({ id: await launchCredits(parsed.data, actor.id) }, { status: 201 });
  } catch (e) {
    return errorResponse(e, actor.idioma);
  }
}
