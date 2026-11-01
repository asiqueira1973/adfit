import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { packagePatchSchema, updatePackage } from "@/server/admin/settings";

/**
 * PATCH /api/admin/pacotes/:id — edita, ativa ou desativa pacote (seção 13; critério 8.9).
 * Recebe: campos parciais do pacote. Devolve: { ok: true } ou { erro, mensagem }.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext<"/api/admin/pacotes/[id]">) {
  const actor = await requireAdminApi();
  if (isResponse(actor)) return actor;
  const t = getDictionary(actor.idioma);
  const { id } = await params;
  const parsed = packagePatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error, t);
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ erro: "validacao", mensagem: t.erros.validacao }, { status: 400 });
  try {
    await updatePackage(id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, actor.idioma);
  }
}
