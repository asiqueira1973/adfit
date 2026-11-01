import Link from "next/link";
import { Suspense } from "react";
import { Banner, EmptyState, PageHeader } from "@/components/ui/feedback";
import { DataTable } from "@/components/ui/table";
import { cn } from "@/components/ui/cn";
import { InviteRequestStatusSelect } from "@/features/invites/status-select";
import { formatDateTime } from "@/lib/format";
import { adminContext } from "@/server/admin/context";
import { listInviteRequests } from "@/server/invites/requests";

const STATUSES = ["novo", "convidado", "recusado"] as const;

/** Tela [Admin] Pedidos de acesso (emenda MD-9): quem pediu convite, com filtro e status por linha. */
export default function AdminInviteRequestsPage({ searchParams }: PageProps<"/admin/pedidos">) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-[14px] bg-surface" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/pedidos">["searchParams"] }) {
  const { t, intl } = await adminContext();
  const c = t.convite;
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const rows = await listInviteRequests(status);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={c.adminTitulo} />
      <Banner tone="info">{c.comoConvidar}</Banner>
      <div className="flex flex-wrap gap-2">
        {[undefined, ...STATUSES].map((s) => (
          <Link key={s ?? "todos"} href={s ? `?status=${s}` : "?"} className={cn("flex min-h-10 items-center rounded-full px-3.5 text-[13px] font-semibold", s === status ? "bg-text text-bg" : "bg-surface")}>
            {s ? c.status[s] : c.todos}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState text={c.adminVazio} />
      ) : (
        <DataTable
          head={[c.colQuando, c.colQuem, c.colMarca, c.colMensagem, c.colStatus]}
          rows={rows.map((r) => [
            formatDateTime(r.criado_em, intl),
            <span key="q"><span className="font-semibold">{r.nome}</span><br /><span className="text-[12px] text-text-2">{r.email}</span></span>,
            <span key="m">{r.marca}{r.instagram && <><br /><span className="text-[12px] text-text-2">@{r.instagram}</span></>}</span>,
            <span key="t" className="block max-w-md whitespace-pre-wrap text-[14px]">{r.mensagem ?? "—"}</span>,
            <InviteRequestStatusSelect key="s" id={r.id} status={r.status} labels={c.status} aria={c.colStatus} />,
          ])}
        />
      )}
    </div>
  );
}
