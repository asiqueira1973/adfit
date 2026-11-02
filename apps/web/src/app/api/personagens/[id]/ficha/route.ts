import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireBrandOrAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { refreshStaleGenerations } from "@/server/higgsfield/stale";
import { characterSheetStatus, requestCharacterSheet } from "@/server/characters/service";
import { redoBodySchema } from "@/server/prompts/redo-shortcuts";

const bodySchema = redoBodySchema("ficha");

/**
 * POST /api/personagens/:id/ficha — gera (2 créditos) ou refaz (1) a ficha de personagem (MD-17).
 * Quem: marca/admin. Corpo: { instrucao?, atalhos? }. Devolve: 202 { ficha_id }.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/personagens/[id]/ficha">) {
  const profile = await requireBrandOrAdminApi();
  if (isResponse(profile)) return profile;
  const { id } = await ctx.params;
  const parsed = bodySchema.safeParse((await request.json().catch(() => ({}))) ?? {});
  if (!parsed.success || !z.string().uuid().safeParse(id).success) return validationError(parsed.error ?? new z.ZodError([]), getDictionary(profile.idioma));
  try {
    const { fichaId } = await requestCharacterSheet(profile, id, parsed.data);
    return NextResponse.json({ ficha_id: fichaId }, { status: 202 });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}

/** GET /api/personagens/:id/ficha — estado das versões (polling de 5 s; reconsulta gerações paradas). */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/personagens/[id]/ficha">) {
  const profile = await requireBrandOrAdminApi();
  if (isResponse(profile)) return profile;
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return errorResponse(new Error("personagem_inexistente"), profile.idioma);
  try {
    const first = await characterSheetStatus(profile, id);
    const state = first.geracoesEmAndamento.length && (await refreshStaleGenerations({ geracaoIds: first.geracoesEmAndamento })) ? await characterSheetStatus(profile, id) : first;
    return NextResponse.json({ ficha_aprovada_id: state.fichaAprovadaId, versoes: state.versoes });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}

/** Duração máxima da função na Vercel: o trabalho com o Claude/Higgsfield segue depois da resposta. */
export const maxDuration = 300;
