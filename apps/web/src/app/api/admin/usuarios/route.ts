import { NextResponse, type NextRequest } from "next/server";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { inviteUser } from "@/server/admin/users";
import { inviteUserSchema } from "@/server/admin/schemas";

/**
 * POST /api/admin/usuarios — convida usuário de marca (seções 6.1 e 13; MD-7: login só com Google).
 * Recebe: { email, nome, marca_id }. Valida: e-mail sem perfil no AdFit. Faz: acesso sem senha +
 * perfil + e-mail de boas-vindas no idioma do admin. Devolve: 201 { id, email_enviado, link } ou
 * { erro, mensagem } (409 `email_existente`).
 */
export async function POST(request: NextRequest) {
  const actor = await requireAdminApi();
  if (isResponse(actor)) return actor;
  const parsed = inviteUserSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error, getDictionary(actor.idioma));
  try {
    const r = await inviteUser(parsed.data, actor.idioma);
    return NextResponse.json({ id: r.id, email_enviado: r.emailEnviado, link: r.link }, { status: 201 });
  } catch (e) {
    return errorResponse(e, actor.idioma);
  }
}
