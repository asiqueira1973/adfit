import { type NextRequest } from "next/server";
import { isResponse, requireAdminApi } from "@/server/api/guards";
import { aggregateCosts, costsCsv, loadCostInputs } from "@/server/admin/costs";

/**
 * GET /api/admin/custos/csv?marca=&mes= — exportação da seção 14 ([Admin] Custos). Só admin.
 * Nome `custos_<aaaa-mm>.csv` (mês filtrado) ou `custos_completo.csv` (sem mês); respeita o filtro
 * de marca. Devolve: o CSV (UTF-8 com BOM, `;`, vírgula decimal).
 */
export async function GET(request: NextRequest) {
  const profile = await requireAdminApi();
  if (isResponse(profile)) return profile;
  const marca = request.nextUrl.searchParams.get("marca") || null;
  const rawMes = request.nextUrl.searchParams.get("mes") ?? "";
  const mes = /^\d{4}-\d{2}$/.test(rawMes) ? rawMes : null;
  const { rows } = aggregateCosts(await loadCostInputs(), { marcaId: marca, mes });
  return new Response(costsCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${mes ? `custos_${mes}` : "custos_completo"}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
