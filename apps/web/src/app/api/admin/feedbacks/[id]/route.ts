import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireAdminApi } from "@/server/api/guards";
import { errorResponse, jsonError, validationError } from "@/server/api/http";
import { setFeedbackStatus } from "@/server/feedback/service";

/**
 * PATCH /api/admin/feedbacks/:id — muda o status de um feedback (emenda MD-6).
 * Quem: admin (eh_admin() no servidor). Corpo: { status: novo | visto | resolvido }.
 */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/feedbacks/[id]">) {
  const profile = await requireAdminApi();
  if (isResponse(profile)) return profile;
  const t = getDictionary(profile.idioma);
  const { id } = await ctx.params;
  const parsed = z.object({ status: z.enum(["novo", "visto", "resolvido"]) }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error, t);
  if (!z.string().uuid().safeParse(id).success) return jsonError("feedback_inexistente", t.erros.generico, 404);
  try {
    await setFeedbackStatus(id, parsed.data.status);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "feedback_inexistente") return jsonError("feedback_inexistente", t.erros.generico, 404);
    return errorResponse(e, profile.idioma);
  }
}
