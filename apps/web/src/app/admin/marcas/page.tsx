import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/table";
import { NewBrandForm } from "@/features/admin/admin-forms";
import { listBrandsForAdmin } from "@/server/admin/brands";
import { adminContext } from "@/server/admin/context";

/**
 * Tela [Admin] Marcas (seção 10): tabela com nome, @, saldo, anúncios no mês e status;
 * "Nova marca" (`?modal=nova`) → POST /api/admin/marcas (critério 8.2).
 */
export default function AdminBrandsPage({ searchParams }: PageProps<"/admin/marcas">) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-[14px] bg-surface" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/marcas">["searchParams"] }) {
  const { t } = await adminContext();
  const { modal } = await searchParams;
  const brands = await listBrandsForAdmin();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.admin.marcasTitulo} action={<ButtonLink href="?modal=nova" className="px-3"><Plus className="size-4.5" /> {t.admin.novaMarca}</ButtonLink>} />
      {brands.length === 0 ? (
        <EmptyState text={t.admin.nenhumaMarca} />
      ) : (
        <DataTable
          head={[t.admin.colMarca, t.admin.colInstagram, t.admin.colSaldo, t.admin.colAnunciosMes, t.admin.colStatus]}
          rows={brands.map((b) => [
            <Link key="n" href={`/admin/marcas/${b.id}`} className="font-semibold hover:underline">{b.nome}</Link>,
            b.instagram ? `@${b.instagram}` : t.admin.vazio,
            <span key="s" className="tabular">{b.saldo}</span>,
            <span key="a" className="tabular">{b.anunciosMes}</span>,
            <Badge key="st" tone={b.ativa ? "success" : "warning"}>{b.ativa ? t.admin.ativa : t.admin.pausada}</Badge>,
          ])}
        />
      )}
      {modal === "nova" && (
        <Modal title={t.admin.novaMarca} closeHref="/admin/marcas">
          <NewBrandForm t={t} />
        </Modal>
      )}
    </div>
  );
}
