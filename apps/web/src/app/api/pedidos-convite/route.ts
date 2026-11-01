import { NextResponse, type NextRequest } from "next/server";
import { getDictionary, isLocale, LOCALE_COOKIE } from "@/lib/i18n";
import { errorResponse, validationError } from "@/server/api/http";
import { createInviteRequest, inviteRequestSchema } from "@/server/invites/requests";

/**
 * POST /api/pedidos-convite — pedido de convite da tela pública (MD-9). Sem sessão (liberada no
 * proxy). Corpo: { nome, email, marca, instagram?, mensagem? }. Não cria conta (seção 28).
 * Devolve: 202 sempre que o corpo é válido (não revela se o e-mail já pediu).
 */
export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookie) ? cookie : "pt_br";
  const parsed = inviteRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error, getDictionary(locale));
  try {
    await createInviteRequest(parsed.data, locale);
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (e) {
    return errorResponse(e, locale);
  }
}
