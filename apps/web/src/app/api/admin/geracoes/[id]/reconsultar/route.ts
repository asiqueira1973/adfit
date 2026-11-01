import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n";
import { isResponse, requireAdminApi } from "@/server/api/guards";
import { errorResponse, jsonError } from "@/server/api/http";
import { getGeneration } from "@/server/higgsfield/process";
import { reconsultGeneration } from "@/server/higgsfield/stale";

/**
 * POST /api/admin/geracoes/:id/reconsultar — consulta o `status_url` e processa como webhook
 * (seção 13). Quem: admin (eh_admin() no servidor). Valida: geração `processando` (ou `na_fila`).
 * Devolve: { status } depois da consulta.
 */
export async function POST(_request: NextRequest, ctx: RouteContext<"/api/admin/geracoes/[id]/reconsultar">) {
  const profile = await requireAdminApi();
  if (isResponse(profile)) return profile;
  const t = getDictionary(profile.idioma);
  const { id } = await ctx.params;
  try {
    if (!z.string().uuid().safeParse(id).success) throw new Error("geracao_inexistente");
    const g = await getGeneration(id);
    if (!g) throw new Error("geracao_inexistente");
    if (g.status !== "processando" && g.status !== "na_fila") return jsonError("transicao_invalida", t.erros.transicaoInvalida, 409);
    return NextResponse.json({ status: await reconsultGeneration(id, { force: true }) });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}

/** Duração máxima da função na Vercel: o trabalho com o Claude/Higgsfield segue depois da resposta. */
export const maxDuration = 300;
