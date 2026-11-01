import { SampleDataNotice } from "@/components/sample-data-notice";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/feedback";
import { SelectField, TextField } from "@/components/ui/field";
import { DataTable } from "@/components/ui/table";
import { fxAdminBrands, fxCosts } from "@/features/fixtures";

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const usd = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" }).format(v);

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
 * Tela [Admin] Custos (critério 8.8 e seção 21): por marca e mês — créditos consumidos, custo USD,
 * custo R$ (cotação de `configuracoes`), receita, margem R$ e %, % de anúncios que chegaram a pronto,
 * créditos médios por anúncio pronto; "Exportar CSV" (seção 14). Fixtures na fase de design.
 */
export default function AdminCostsPage() {
  const c = fxCosts;
  const custoBrl = c.custo_usd * c.cotacao;
  const margem = c.receita_brl - custoBrl;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Custos" action={<Button variant="secondary"><Download className="size-4.5" /> Exportar CSV</Button>} />
      <SampleDataNotice />
      <form className="grid grid-cols-2 gap-3 md:max-w-md">
        <SelectField label="Marca" name="marca" options={[{ value: "", label: "Todas" }, ...fxAdminBrands.map((b) => ({ value: b.id, label: b.nome }))]} />
        <TextField label="Mês" name="mes" type="month" defaultValue="2026-10" />
      </form>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Créditos consumidos" value={String(c.creditos_consumidos)} />
        <Kpi label="Custo real" value={usd(c.custo_usd)} hint={`${brl(custoBrl)} · cotação ${c.cotacao.toFixed(2).replace(".", ",")}`} />
        <Kpi label="Receita" value={brl(c.receita_brl)} />
        <Kpi label="Margem" value={brl(margem)} hint={`${((margem / c.receita_brl) * 100).toFixed(1).replace(".", ",")}%`} />
        <Kpi label="Anúncios prontos" value={`${Math.round((c.anuncios_prontos / c.anuncios_criados) * 100)}%`} hint={`${c.anuncios_prontos} de ${c.anuncios_criados}`} />
        <Kpi label="Créditos por anúncio pronto" value={c.creditos_por_anuncio_pronto.toFixed(1).replace(".", ",")} hint="meta ≤ 22" />
      </div>
      <DataTable
        head={["Marca", "Mês", "Créditos", "Custo USD", "Custo R$", "Receita R$", "Margem"]}
        rows={[["Kore Active", "10/2026", <span key="c" className="tabular">{c.creditos_consumidos}</span>, usd(c.custo_usd), brl(custoBrl), brl(c.receita_brl), `${((margem / c.receita_brl) * 100).toFixed(1).replace(".", ",")}%`]]}
      />
    </div>
  );
}
