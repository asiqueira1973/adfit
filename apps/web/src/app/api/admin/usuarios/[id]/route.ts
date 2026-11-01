import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { setUserActive } from "@/server/admin/users";
import { setUserActiveSchema } from "@/server/admin/schemas";

/**
 * PATCH /api/admin/usuarios/:id — ativa/desativa usuário (seções 6.3 e 13).
 * Recebe: { ativo }. Devolve: { ok: true } ou { erro, mensagem }.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext<"/api/admin/usuarios/[id]">) {
  const actor = await requireAdminApi();
  if (isResponse(actor)) return actor;
  const t = getDictionary(actor.idioma);
  const { id } = await params;
  const parsed = setUserActiveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !z.string().uuid().safeParse(id).success) {
    return parsed.success ? NextResponse.json({ erro: "validacao", mensagem: t.erros.validacao }, { status: 400 }) : validationError(parsed.error, t);
  }
  try {
    await setUserActive(id, parsed.data.ativo, actor.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, actor.idioma);
  }
}
