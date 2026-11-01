import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink, X } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListGroup, ListRow } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/feedback";
import { SelectField } from "@/components/ui/field";
import { DataTable } from "@/components/ui/table";
import { RecheckButton } from "@/features/admin/recheck-button";
import { fill } from "@/lib/copy";
import { formatDateTime } from "@/lib/format";
import { adminContext } from "@/server/admin/context";
import { GENERATIONS_LIMIT, getGenerationDetail, listGenerations } from "@/server/admin/generations";
import { listBrandsForAdmin } from "@/server/admin/brands";

const TONE: Record<string, Tone> = { na_fila: "neutral", processando: "processing", concluida: "success", falhou: "danger", bloqueada_nsfw: "danger" };

/**
 * Tela [Admin] Gerações (seção 10; critério 8.8): as mais recentes, filtráveis por tipo, status e
 * marca; `?detalhe=<id>` abre o painel com entrada, erro, request_id, custo, link do resultado e
 * "Reconsultar" para gerações em processamento.
 */
export default function AdminGenerationsPage({ searchParams }: PageProps<"/admin/geracoes">) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-[14px] bg-surface" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/geracoes">["searchParams"] }) {
  const { t, intl } = await adminContext();
  const r = t.relatorios;
  const sp = await searchParams;
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  const filter = { tipo: str(sp.tipo), status: str(sp.status), marcaId: str(sp.marca) };
  const [gens, brands] = await Promise.all([listGenerations(filter), listBrandsForAdmin()]);
  const keep = new URLSearchParams(Object.entries({ tipo: filter.tipo, status: filter.status, marca: filter.marcaId }).filter(([, v]) => v) as Array<[string, string]>);
  const detailHref = (id: string) => `?${new URLSearchParams([...keep, ["detalhe", id]]).toString()}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={r.geracoesTitulo} />
      <form className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <SelectField label={r.tipo} name="tipo" defaultValue={filter.tipo ?? ""} options={[{ value: "", label: r.todos }, ...Object.entries(r.tipos).map(([value, label]) => ({ value, label }))]} />
        <SelectField label={r.status} name="status" defaultValue={filter.status ?? ""} options={[{ value: "", label: r.todos }, ...Object.entries(r.statusGeracao).map(([value, label]) => ({ value, label }))]} />
        <SelectField label={r.marca} name="marca" defaultValue={filter.marcaId ?? ""} options={[{ value: "", label: r.todas }, ...brands.map((b) => ({ value: b.id, label: b.nome }))]} />
        <Button type="submit" variant="secondary">{r.filtrar}</Button>
      </form>
      {gens.length === 0 ? (
        <p className="text-[15px] text-text-2">{r.semGeracoes}</p>
      ) : (
        <>
          <DataTable
            head={[r.colQuando, r.colMarca, r.colTipo, r.colStatus, r.colTentativa, r.colCusto, ""]}
            rows={gens.map((g) => [
              formatDateTime(g.criado_em, intl),
              g.marca,
              r.tipos[g.tipo as keyof typeof r.tipos],
              <Badge key="s" tone={TONE[g.status]}>{r.statusGeracao[g.status as keyof typeof r.statusGeracao]}</Badge>,
              <span key="t" className="tabular">{g.tentativa}</span>,
              <span key="c" className="tabular">{g.custo_usd === null ? "—" : `US$ ${g.custo_usd.toFixed(2)}`}</span>,
              <Link key="d" href={detailHref(g.id)} scroll={false} className="font-semibold text-brand-text">{r.detalhe}</Link>,
            ])}
          />
          {gens.length >= GENERATIONS_LIMIT && <p className="text-[13px] text-text-2">{fill(r.limite, { n: GENERATIONS_LIMIT })}</p>}
        </>
      )}
      {str(sp.detalhe) && <Detail id={str(sp.detalhe)!} closeHref={`?${keep.toString()}`} t={r} intl={intl} />}
    </div>
  );
}

async function Detail({ id, closeHref, t, intl }: { id: string; closeHref: string; t: Awaited<ReturnType<typeof adminContext>>["t"]["relatorios"]; intl: string }) {
  const g = await getGenerationDetail(id);
  if (!g) return null;
  return (
    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col gap-5 overflow-y-auto border-l border-hairline bg-bg p-5 shadow-2xl" aria-label={t.detalhe}>
      <div className="flex items-center justify-between">
        <h2 className="text-[22px] font-bold tracking-tight">{t.tipos[g.tipo as keyof typeof t.tipos]}</h2>
        <Link href={closeHref} scroll={false} aria-label={t.fechar} className="flex size-11 items-center justify-center rounded-full hover:bg-surface"><X className="size-5" /></Link>
      </div>
      <ListGroup>
        <ListRow label={t.colMarca} value={g.marca} />
        <ListRow label={t.colQuando} value={formatDateTime(g.criado_em, intl)} />
        <ListRow label={t.status} value={<Badge tone={TONE[g.status]}>{t.statusGeracao[g.status as keyof typeof t.statusGeracao]}</Badge>} />
        <ListRow label={t.modelo} value={<span className="font-mono text-[12px]">{g.modelo}</span>} />
        <ListRow label={t.requestId} value={<span className="font-mono text-[12px]">{g.request_id ?? "—"}</span>} />
        <ListRow label={t.tentativa} value={g.tentativa} />
        <ListRow label={t.custo} value={g.custo_usd === null ? t.naoCobrado : `US$ ${g.custo_usd.toFixed(4)}`} />
      </ListGroup>
      {g.erro && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold uppercase tracking-wide text-text-2">{t.erro}</span>
          <div className="rounded-[10px] bg-danger/10 p-3 font-mono text-[12px]">{g.erro}</div>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold uppercase tracking-wide text-text-2">{t.entrada}</span>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-[10px] bg-surface p-3 text-[12px]">{JSON.stringify(g.entrada, null, 2)}</pre>
      </div>
      {g.resultado && (
        <a href={g.resultado} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-[15px] font-semibold text-brand-text">
          <ExternalLink className="size-4" /> {t.abrirResultado}
        </a>
      )}
      {(g.status === "processando" || g.status === "na_fila") && <RecheckButton id={g.id} label={t.reconsultar} done={t.reconsultado} error={t.erro} />}
    </aside>
  );
}
