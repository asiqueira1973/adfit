import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink, RefreshCw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListGroup, ListRow } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/feedback";
import { SelectField } from "@/components/ui/field";
import { DataTable } from "@/components/ui/table";
import { fxAdminBrands, fxGenerations, GEN_BADGE, GEN_TYPE_LABEL } from "@/features/fixtures";
import { formatDateTime } from "@/lib/format";

/**
 * Tela [Admin] Gerações (seção 10 e critério 8.8): lista filtrável por tipo, status e marca;
 * detalhe lateral com entrada, erro, link do resultado e custo; "Reconsultar" para gerações em
 * `processando` (`POST /api/admin/geracoes/:id/reconsultar`). `?detalhe=<id>` abre o painel.
 */
export default function AdminGenerationsPage({ searchParams }: PageProps<"/admin/geracoes">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Gerações" />
      <form className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SelectField label="Tipo" name="tipo" options={[{ value: "", label: "Todos" }, ...Object.entries(GEN_TYPE_LABEL).map(([value, label]) => ({ value, label }))]} />
        <SelectField label="Status" name="status" options={[{ value: "", label: "Todos" }, ...Object.entries(GEN_BADGE).map(([value, b]) => ({ value, label: b.label }))]} />
        <SelectField label="Marca" name="marca" options={[{ value: "", label: "Todas" }, ...fxAdminBrands.map((b) => ({ value: b.id, label: b.nome }))]} />
      </form>
      <DataTable
        head={["Quando", "Marca", "Tipo", "Status", "Tentativa", "Custo", ""]}
        rows={fxGenerations.map((g) => [
          formatDateTime(g.criado_em), g.marca, GEN_TYPE_LABEL[g.tipo],
          <Badge key="s" tone={GEN_BADGE[g.status].tone}>{GEN_BADGE[g.status].label}</Badge>,
          <span key="t" className="tabular">{g.tentativa}</span>,
          <span key="c" className="tabular">{g.custo_usd === null ? "—" : `US$ ${g.custo_usd.toFixed(2)}`}</span>,
          <Link key="d" href={`?detalhe=${g.id}`} className="font-semibold text-brand-text">Detalhe</Link>,
        ])}
      />
      <Suspense><Detail searchParams={searchParams} /></Suspense>
    </div>
  );
}

async function Detail({ searchParams }: { searchParams: PageProps<"/admin/geracoes">["searchParams"] }) {
  const { detalhe } = await searchParams;
  const g = fxGenerations.find((x) => x.id === detalhe);
  if (!g) return null;
  return (
    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col gap-5 overflow-y-auto border-l border-hairline bg-bg p-5 shadow-2xl" aria-label="Detalhe da geração">
      <div className="flex items-center justify-between">
        <h2 className="text-[22px] font-bold tracking-tight">{GEN_TYPE_LABEL[g.tipo]}</h2>
        <Link href="/admin/geracoes" aria-label="Fechar" className="flex size-11 items-center justify-center rounded-full hover:bg-surface"><X className="size-5" /></Link>
      </div>
      <ListGroup>
        <ListRow label="Status" value={<Badge tone={GEN_BADGE[g.status].tone}>{GEN_BADGE[g.status].label}</Badge>} />
        <ListRow label="Modelo" value={<span className="font-mono text-[12px]">{g.modelo}</span>} />
        <ListRow label="request_id" value={<span className="font-mono text-[12px]">{g.request_id}</span>} />
        <ListRow label="Tentativa" value={g.tentativa} />
        <ListRow label="Custo" value={g.custo_usd === null ? "não cobrado" : `US$ ${g.custo_usd.toFixed(4)}`} />
      </ListGroup>
      {g.erro && <div className="rounded-[10px] bg-danger/10 p-3 font-mono text-[12px]">{g.erro}</div>}
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold uppercase tracking-wide text-text-2">Entrada</span>
        <pre className="overflow-x-auto rounded-[10px] bg-surface p-3 text-[12px]">{JSON.stringify({ prompt: "Low-angle close-up of… (prompt montado + cláusula fixa)", duration: 5, aspect_ratio: "9:16", image: "[url assinada removida]" }, null, 2)}</pre>
      </div>
      {g.status === "concluida" && <a href="#" className="flex items-center gap-1.5 text-[15px] font-semibold text-brand-text"><ExternalLink className="size-4" /> Abrir resultado</a>}
      {g.status === "processando" && <Button variant="secondary"><RefreshCw className="size-4" /> Reconsultar</Button>}
    </aside>
  );
}
