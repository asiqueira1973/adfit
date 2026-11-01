import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/feedback";
import { TextField } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/table";
import { fxAdminBrands } from "@/features/fixtures";

/**
 * Tela [Admin] Marcas (seção 10): tabela com nome, saldo, anúncios no mês e status; "Nova marca"
 * (`?modal=nova`). Ligada a `POST /api/admin/marcas` no épico 8.2.
 */
export default function AdminBrandsPage({ searchParams }: PageProps<"/admin/marcas">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Marcas" action={<ButtonLink href="?modal=nova" className="px-3"><Plus className="size-4.5" /> Nova marca</ButtonLink>} />
      <DataTable
        head={["Marca", "Instagram", "Saldo", "Anúncios no mês", "Status"]}
        rows={fxAdminBrands.map((b) => [
          <Link key="n" href={`/admin/marcas/${b.id}`} className="font-semibold hover:underline">{b.nome}</Link>,
          b.instagram ? `@${b.instagram}` : "—",
          <span key="s" className="tabular">{b.saldo}</span>,
          <span key="a" className="tabular">{b.anuncios_mes}</span>,
          <Badge key="st" tone={b.ativa ? "success" : "warning"}>{b.ativa ? "Ativa" : "Pausada"}</Badge>,
        ])}
      />
      <Suspense><NewBrandModal searchParams={searchParams} /></Suspense>
    </div>
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
