import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireBrandApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { createCheckout } from "@/server/stripe/checkout";

/**
 * POST /api/creditos/checkout — inicia a compra de um pacote (seção 13; critério 8.9).
 * Quem: usuário da marca (admin não compra, seção 5). Recebe: { pacote_id }.
 * Valida: pacote ativo, marca ativa. Devolve: { url } da Checkout Session para redirecionar.
 */
export async function POST(request: NextRequest) {
  const profile = await requireBrandApi();
  if (isResponse(profile)) return profile;
  const parsed = z.object({ pacote_id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error, getDictionary(profile.idioma));
  try {
    const { url } = await createCheckout(profile, parsed.data.pacote_id);
    return NextResponse.json({ url });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}
