import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { updateBrand } from "@/server/admin/brands";
import { updateBrandSchema } from "@/server/admin/schemas";

/**
 * PATCH /api/admin/marcas/:id — edita o kit e/ou pausa/reativa a marca (critério 8.2, seção 6.3).
 * Rota necessária para a tela [Admin] Marca ("editar, pausar"); não listada na seção 13 (D-8).
 * Recebe: JSON parcial do kit e/ou { ativa }. Devolve: { ok: true } ou { erro, mensagem }.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext<"/api/admin/marcas/[id]">) {
  const actor = await requireAdminApi();
  if (isResponse(actor)) return actor;
  const t = getDictionary(actor.idioma);
  const { id } = await params;
  const parsed = updateBrandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !z.string().uuid().safeParse(id).success) {
    return parsed.success ? NextResponse.json({ erro: "validacao", mensagem: t.erros.validacao }, { status: 400 }) : validationError(parsed.error, t);
  }
  try {
    await updateBrand(id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, actor.idioma);
  }
}
