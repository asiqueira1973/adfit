import { NextResponse, type NextRequest } from "next/server";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { inviteUser } from "@/server/admin/users";
import { inviteUserSchema } from "@/server/admin/schemas";

/**
 * POST /api/admin/usuarios — convida usuário de marca (seções 6.1 e 13).
 * Recebe: { email, nome, marca_id }. Valida: e-mail não existe. Faz: convite + perfil.
 * Devolve: 201 { id } ou { erro, mensagem } (409 `email_existente`).
 */
export async function POST(request: NextRequest) {
  const actor = await requireAdminApi();
  if (isResponse(actor)) return actor;
  const parsed = inviteUserSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error, getDictionary(actor.idioma));
  try {
    return NextResponse.json({ id: await inviteUser(parsed.data) }, { status: 201 });
  } catch (e) {
    return errorResponse(e, actor.idioma);
  }
}
