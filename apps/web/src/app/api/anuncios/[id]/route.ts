import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isResponse, requireBrandOrAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { getDictionary } from "@/lib/i18n";
import { archiveAd, getAdView, refreshAd } from "@/server/ads/service";

/**
 * GET /api/anuncios/:id — estado do anúncio para o polling de 5 s da tela (critério 8.5:
 * progresso sem recarregar). Antes de ler, roda a varredura de órfãos e gerações paradas
 * (seções 4.3 e 12.2). Divergência D-20 (rota fora da seção 13). Sem prompt/modelo/custo (seção 5).
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/anuncios/[id]">) {
  const profile = await requireBrandOrAdminApi();
  if (isResponse(profile)) return profile;
  const { id } = await ctx.params;
  try {
    if (!z.string().uuid().safeParse(id).success) throw new Error("anuncio_inexistente");
    await getAdView(profile, id);
    await refreshAd(id);
    const view = await getAdView(profile, id);
    return NextResponse.json({
      status: view.status,
      cenas: view.cenas.map((c) => ({ id: c.id, ordem: c.ordem, quadros: c.quadros.map((q) => ({ id: q.id, status: q.status })), clipes: c.clipes.map((k) => ({ id: k.id, status: k.status })) })),
    });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}

const patchSchema = z.object({ arquivado: z.literal(true) }).strict();

/**
 * PATCH /api/anuncios/:id — arquivar anúncio (seção 6; divergência D-24: rota fora da seção 13).
 * Quem: marca (próprios) ou admin. Corpo: { arquivado: true }. Recusa anúncio em andamento.
 * Devolve: { ok: true }.
 */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/anuncios/[id]">) {
  const profile = await requireBrandOrAdminApi();
  if (isResponse(profile)) return profile;
  const { id } = await ctx.params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error, getDictionary(profile.idioma));
  try {
    if (!z.string().uuid().safeParse(id).success) throw new Error("anuncio_inexistente");
    await archiveAd(profile, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}

/** Duração máxima da função na Vercel: o trabalho com o Claude/Higgsfield segue depois da resposta. */
export const maxDuration = 300;
