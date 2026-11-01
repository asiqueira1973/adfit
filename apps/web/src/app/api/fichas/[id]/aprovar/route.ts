import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isResponse, requireBrandOrAdminApi } from "@/server/api/guards";
import { errorResponse } from "@/server/api/http";
import { approveSheet } from "@/server/sheets/service";

/**
 * POST /api/fichas/:id/aprovar — aprova uma versão da ficha (seção 13; critério 8.4).
 * Quem: marca/admin. Valida: ficha da marca; `aguardando_aprovacao`, `aprovada` ou `descartada`
 * com imagem. Efeito: `ficha_aprovada_id`; as demais versões viram `descartada`. Sem custo.
 * Devolve: { produto_id }.
 */
export async function POST(_request: NextRequest, ctx: RouteContext<"/api/fichas/[id]/aprovar">) {
  const profile = await requireBrandOrAdminApi();
  if (isResponse(profile)) return profile;
  const { id } = await ctx.params;
  try {
    if (!z.string().uuid().safeParse(id).success) throw new Error("ficha_inexistente");
    const { produtoId } = await approveSheet(profile, id);
    return NextResponse.json({ produto_id: produtoId });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}
