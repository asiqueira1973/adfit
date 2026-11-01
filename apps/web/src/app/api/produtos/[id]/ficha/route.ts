import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireBrandOrAdminApi } from "@/server/api/guards";
import { errorResponse, validationError } from "@/server/api/http";
import { refreshStaleGenerations } from "@/server/higgsfield/stale";
import { requestSheet, sheetStatus } from "@/server/sheets/service";

const bodySchema = z.object({ instrucao: z.string().max(200).optional() }).strict();

/**
 * POST /api/produtos/:id/ficha — gera (v1) ou refaz a ficha (seção 13; critérios 8.4).
 * Quem: marca/admin. Corpo: { instrucao?: string ≤ 200 }. Valida: produto da marca, não arquivado,
 * ≥1 foto, nenhuma ficha `gerando`. Efeito: debita `gerar_ficha`/`refazer_ficha`, cria a versão e
 * submete. Devolve: 202 { ficha_id }.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/produtos/[id]/ficha">) {
  const profile = await requireBrandOrAdminApi();
  if (isResponse(profile)) return profile;
  const { id } = await ctx.params;
  const raw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw ?? {});
  if (!parsed.success || !z.string().uuid().safeParse(id).success) {
    return validationError(parsed.error ?? new z.ZodError([]), getDictionary(profile.idioma));
  }
  try {
    const { fichaId } = await requestSheet(profile, id, parsed.data.instrucao);
    return NextResponse.json({ ficha_id: fichaId }, { status: 202 });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}

/**
 * GET /api/produtos/:id/ficha — estado das versões para o polling de 5 s da tela (critério 8.4:
 * "exibida sem recarregar a página"). Aciona o polling de reserva das gerações paradas há mais
 * de 3 min (seção 4.3). Divergência D-15: rota fora da tabela da seção 13.
 * Devolve: { ficha_aprovada_id, versoes: [{ id, versao, status }] }.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/produtos/[id]/ficha">) {
  const profile = await requireBrandOrAdminApi();
  if (isResponse(profile)) return profile;
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return errorResponse(new Error("produto_inexistente"), profile.idioma);
  try {
    const first = await sheetStatus(profile, id);
    if (first.geracoesEmAndamento.length && (await refreshStaleGenerations({ geracaoIds: first.geracoesEmAndamento }))) {
      const after = await sheetStatus(profile, id);
      return NextResponse.json({ ficha_aprovada_id: after.fichaAprovadaId, versoes: after.versoes });
    }
    return NextResponse.json({ ficha_aprovada_id: first.fichaAprovadaId, versoes: first.versoes });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}

/** Duração máxima da função na Vercel: o trabalho com o Claude/Higgsfield segue depois da resposta. */
export const maxDuration = 300;
