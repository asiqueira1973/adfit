import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/feedback";
import { TextField } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/table";
import { listBrandsForAdmin } from "@/server/admin/brands";

/**
 * Tela [Admin] Marcas (seção 10): tabela com nome, saldo, anúncios no mês e status, lida do banco
 * (épico 8.1). "Nova marca" (`?modal=nova`) passa a gravar via `POST /api/admin/marcas` no épico 8.2.
 */
export default function AdminBrandsPage({ searchParams }: PageProps<"/admin/marcas">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Marcas" action={<ButtonLink href="?modal=nova" className="px-3"><Plus className="size-4.5" /> Nova marca</ButtonLink>} />
      <Suspense fallback={<div className="h-32 animate-pulse rounded-[14px] bg-surface" />}>
        <BrandsTable />
      </Suspense>
      <Suspense><NewBrandModal searchParams={searchParams} /></Suspense>
    </div>
  );
}

async function BrandsTable() {
  const brands = await listBrandsForAdmin();
  return (
    <DataTable
      head={["Marca", "Instagram", "Saldo", "Anúncios no mês", "Status"]}
      rows={brands.map((b) => [
        <Link key="n" href={`/admin/marcas/${b.id}`} className="font-semibold hover:underline">{b.nome}</Link>,
        b.instagram ? `@${b.instagram}` : "—",
        <span key="s" className="tabular">{b.saldo}</span>,
        <span key="a" className="tabular">{b.anunciosMes}</span>,
        <Badge key="st" tone={b.ativa ? "success" : "warning"}>{b.ativa ? "Ativa" : "Pausada"}</Badge>,
      ])}
    />
  );
}

async function NewBrandModal({ searchParams }: { searchParams: PageProps<"/admin/marcas">["searchParams"] }) {
  const { modal } = await searchParams;
  if (modal !== "nova") return null;
  return (
    <Modal title="Nova marca" closeHref="/admin/marcas">
      <form className="flex flex-col gap-4">
        <TextField label="Nome" name="nome" required />
        <TextField label="Instagram" name="instagram" hint="Sem o @." />
        <Button type="submit">Criar marca</Button>
      </form>
    </Modal>
  );
}
