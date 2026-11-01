import { NextResponse, type NextRequest } from "next/server";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { saveSettings, settingsSchema } from "@/server/admin/settings";

/**
 * PUT /api/admin/configuracoes — preços por ação e configurações (seção 13; regras 11.1 e 11.6).
 * Recebe: { precos?: [{ acao, creditos }], configuracoes?: [{ chave, valor }] }. Valida: creditos ≥ 0.
 * Devolve: { ok: true } ou { erro, mensagem }.
 */
export async function PUT(request: NextRequest) {
  const actor = await requireAdminApi();
  if (isResponse(actor)) return actor;
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error, getDictionary(actor.idioma));
  try {
    await saveSettings(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, actor.idioma);
  }
}
