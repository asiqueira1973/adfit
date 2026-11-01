import { NextResponse, type NextRequest } from "next/server";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireBrandOrAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { createAd, createAdSchema } from "@/server/ads/service";

/**
 * POST /api/anuncios — cria o anúncio (seção 13; critérios 8.5). Quem: marca/admin.
 * Corpo: opções da 11.4 + `produto_id`. Valida: produto com ficha aprovada; marca ativa (débito).
 * Efeito: debita `gerar_roteiro_quadros`, cria o anúncio e segue roteiro → quadros em segundo
 * plano. Devolve: 202 { anuncio_id }.
 */
export async function POST(request: NextRequest) {
  const profile = await requireBrandOrAdminApi();
  if (isResponse(profile)) return profile;
  const parsed = createAdSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error, getDictionary(profile.idioma));
  try {
    const { anuncioId } = await createAd(profile, parsed.data);
    return NextResponse.json({ anuncio_id: anuncioId }, { status: 202 });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}

/** Duração máxima da função na Vercel: o trabalho com o Claude/Higgsfield segue depois da resposta. */
export const maxDuration = 300;
