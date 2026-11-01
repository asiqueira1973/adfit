import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireAdminApi } from "@/server/api/guards";
import { errorResponse, jsonError, validationError } from "@/server/api/http";
import { setInviteRequestStatus } from "@/server/invites/requests";

/** PATCH /api/admin/pedidos/:id — status do pedido de convite (MD-9). Quem: admin. Corpo: { status }. */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/pedidos/[id]">) {
  const profile = await requireAdminApi();
  if (isResponse(profile)) return profile;
  const t = getDictionary(profile.idioma);
  const { id } = await ctx.params;
  const parsed = z.object({ status: z.enum(["novo", "convidado", "recusado"]) }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error, t);
  if (!z.string().uuid().safeParse(id).success) return jsonError("pedido_inexistente", t.erros.generico, 404);
  try {
    await setInviteRequestStatus(id, parsed.data.status);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "pedido_inexistente") return jsonError("pedido_inexistente", t.erros.generico, 404);
    return errorResponse(e, profile.idioma);
  }
}
