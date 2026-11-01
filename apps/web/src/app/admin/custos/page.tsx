import { Suspense } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/feedback";
import { SelectField, TextField } from "@/components/ui/field";
import { DataTable } from "@/components/ui/table";
import { fill } from "@/lib/copy";
import { formatMoney } from "@/lib/format";
import { adminContext } from "@/server/admin/context";
import { aggregateCosts, loadCostInputs, monthKey } from "@/server/admin/costs";

/** Bloco de indicador (número grande tabular + rótulo). */
function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <span className="text-[13px] font-medium text-text-2">{label}</span>
      <span className="tabular text-[26px] font-bold leading-tight tracking-tight">{value}</span>
      {hint && <span className="text-[12px] text-text-2">{hint}</span>}
    </Card>
  );
}

/**
 * Tela [Admin] Custos (critério 8.8; seções 14 e 21): filtro por marca e mês (padrão: mês atual;
 * vazio = todos); créditos consumidos, custo real US$ e R$, receita, margem; as 4 métricas da seção
 * 21; tabela por marca e mês; "Exportar CSV" com os mesmos filtros (GET /api/admin/custos/csv).
 */
export default function AdminCostsPage({ searchParams }: PageProps<"/admin/custos">) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-[14px] bg-surface" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/custos">["searchParams"] }) {
  const { t, intl } = await adminContext();
  const r = t.relatorios;
  const sp = await searchParams;
  const marca = typeof sp.marca === "string" && sp.marca ? sp.marca : null;
  // Sem o parâmetro: mês atual; `mes=` vazio: todos os meses.
  const mes = typeof sp.mes === "string" ? (/^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : null) : monthKey(new Date().toISOString());
  const input = await loadCostInputs();
  const { rows, totais, metricas } = aggregateCosts(input, { marcaId: marca, mes });
  const brl = (v: number) => formatMoney(Math.round(v * 100), "brl", intl);
  const usd = (v: number) => formatMoney(Math.round(v * 100), "usd", intl);
  const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1).replace(".", ",")}%`);
  const num = (v: number | null) => (v === null ? "—" : v.toFixed(1).replace(".", ","));
  const qs = new URLSearchParams({ ...(marca ? { marca } : {}), mes: mes ?? "" }).toString();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={r.custosTitulo}
        action={
          <a href={`/api/admin/custos/csv?${qs}`} className="inline-flex min-h-11 items-center gap-2 rounded-[12px] bg-surface px-4 text-[15px] font-semibold hover:bg-text/10">
            <Download className="size-4.5" /> {r.exportarCsv}
          </a>
        }
      />
      <form className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_auto] md:max-w-2xl">
        <SelectField label={r.marca} name="marca" defaultValue={marca ?? ""} options={[{ value: "", label: r.todas }, ...input.brands.map((b) => ({ value: b.id, label: b.nome }))]} />
        <TextField label={r.mes} name="mes" type="month" defaultValue={mes ?? ""} />
        <Button type="submit" variant="secondary">{r.filtrar}</Button>
      </form>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={r.creditosConsumidos} value={String(totais.creditos_consumidos)} hint={fill(r.estornados, { n: totais.creditos_estornados })} />
        <Kpi label={r.custoReal} value={usd(totais.custo_usd)} hint={fill(r.cotacao, { brl: brl(totais.custo_brl), v: input.cotacaoUsdBrl.toFixed(2).replace(".", ",") })} />
        <Kpi label={r.receita} value={brl(totais.receita_brl)} />
        <Kpi label={r.margem} value={brl(totais.margem_brl)} hint={pct(metricas.margemPct)} />
      </div>
      {/* Métricas de sucesso do piloto (seção 21). */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={r.anunciosProntos} value={pct(metricas.pctProntos)} hint={fill(r.prontosDica, { a: totais.anuncios_prontos, b: totais.anuncios_criados })} />
        <Kpi label={r.downloadsSemana} value={num(metricas.downloadsPorSemana)} hint={fill(r.downloadsDica, { n: totais.downloads })} />
        <Kpi label={r.creditosPorPronto} value={num(metricas.creditosPorAnuncioPronto)} hint={r.creditosPorProntoDica} />
        <Kpi label={r.margemBruta} value={pct(metricas.margemPct)} hint={r.margemDica} />
      </div>

      {rows.length === 0 ? (
        <p className="text-[15px] text-text-2">{r.semDados}</p>
      ) : (
        <DataTable
          head={[r.colMarca, r.colMes, r.colAnuncios, r.colVideos, r.colCreditos, r.colCustoUsd, r.colCustoBrl, r.colReceita, r.colMargem]}
          rows={rows.map((row) => [
            row.marca,
            `${row.mes.slice(5)}/${row.mes.slice(0, 4)}`,
            <span key="a" className="tabular">{row.anuncios_criados}</span>,
            <span key="v" className="tabular">{row.videos_gerados}</span>,
            <span key="c" className="tabular">{row.creditos_consumidos}</span>,
            usd(row.custo_usd),
            brl(row.custo_brl),
            brl(row.receita_brl),
            row.receita_brl ? pct(row.margem_brl / row.receita_brl) : brl(row.margem_brl),
          ])}
        />
      )}
    </div>
  );
}
