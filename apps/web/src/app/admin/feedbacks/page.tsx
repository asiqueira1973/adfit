import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { DataTable } from "@/components/ui/table";
import { cn } from "@/components/ui/cn";
import { FeedbackStatusSelect } from "@/features/feedback/status-select";
import { formatDateTime } from "@/lib/format";
import { adminContext } from "@/server/admin/context";
import { listFeedbacks } from "@/server/feedback/service";

const STATUSES = ["novo", "visto", "resolvido"] as const;

/**
 * Tela [Admin] Feedbacks (emenda MD-6): mensagens dos usuários, mais recentes primeiro, filtro por
 * status (`?status=`) e troca de status na própria linha.
 */
export default function AdminFeedbacksPage({ searchParams }: PageProps<"/admin/feedbacks">) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-[14px] bg-surface" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/feedbacks">["searchParams"] }) {
  const { t, intl } = await adminContext();
  const f = t.feedback;
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const rows = await listFeedbacks(status);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={f.adminTitulo} />
      <div className="flex flex-wrap gap-2">
        {[undefined, ...STATUSES].map((s) => (
          <Link
            key={s ?? "todos"}
            href={s ? `?status=${s}` : "?"}
            className={cn("flex min-h-10 items-center rounded-full px-3.5 text-[13px] font-semibold", s === status ? "bg-text text-bg" : "bg-surface")}
          >
            {s ? f.status[s] : f.todos}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState text={f.adminVazio} />
      ) : (
        <DataTable
          head={[f.colQuando, f.colQuem, f.colTipo, f.colMensagem, f.colTela, f.colStatus]}
          rows={rows.map((r) => [
            formatDateTime(r.criadoEm, intl),
            <span key="q"><span className="font-semibold">{r.usuario}</span><br /><span className="text-[12px] text-text-2">{r.marca ?? r.email}</span></span>,
            <Badge key="t" tone={r.tipo === "problema" ? "danger" : "processing"}>{r.tipo === "problema" ? f.problema : f.sugestao}</Badge>,
            <span key="m" className="block max-w-md whitespace-pre-wrap text-[14px]">{r.texto}</span>,
            <span key="tl" className="text-[13px] text-text-2">{r.tela ?? "—"}</span>,
            <FeedbackStatusSelect key="s" id={r.id} status={r.status} labels={f.status} aria={f.colStatus} />,
          ])}
        />
      )}
    </div>
  );
}
