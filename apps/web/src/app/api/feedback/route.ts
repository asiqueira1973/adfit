import { NextResponse, type NextRequest } from "next/server";
import { getDictionary } from "@/lib/i18n";
import { getCurrentProfile } from "@/server/auth/profile";
import { errorResponse, jsonError, validationError } from "@/server/api/http";
import { feedbackSchema, sendFeedback } from "@/server/feedback/service";

/**
 * POST /api/feedback — o usuário manda um problema ou sugestão (emenda MD-6). Quem: qualquer
 * usuário ativo do AdFit (marca ou admin). Corpo: { tipo, texto ≤ 2000, tela? }. Devolve: 201.
 */
export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  const t = getDictionary(profile?.idioma);
  if (!profile) return jsonError("nao_autenticado", t.erros.naoAutenticado, 401);
  if (!profile.ativo) return jsonError("nao_autorizado", t.erros.naoAutorizado, 403);
  const parsed = feedbackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error, t);
  try {
    await sendFeedback(profile, parsed.data);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}
