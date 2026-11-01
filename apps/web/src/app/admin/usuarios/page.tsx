import { Suspense } from "react";
import { UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/feedback";
import { SelectField, TextField } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/table";
import { fxAdminBrands, fxAdminUsers } from "@/features/fixtures";

/**
 * Tela [Admin] Usuários (seção 10): todos os usuários com marca e status; "Convidar" (e-mail, nome,
 * marca) e desativar/reativar. Ligada a `/api/admin/usuarios` no épico 8.2. `?modal=convidar`.
 */
export default function AdminUsersPage({ searchParams }: PageProps<"/admin/usuarios">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Usuários" action={<ButtonLink href="?modal=convidar" className="px-3"><UserPlus className="size-4.5" /> Convidar</ButtonLink>} />
      <DataTable
        head={["Nome", "E-mail", "Marca", "Status", ""]}
        rows={fxAdminUsers.map((u) => [
          <span key="n" className="font-semibold">{u.nome}</span>, u.email, u.marca,
          <Badge key="s" tone={u.ativo ? "success" : "neutral"}>{u.ativo ? "Ativo" : "Desativado"}</Badge>,
          <Button key="a" variant="ghost" className="min-h-9 text-[13px]">{u.ativo ? "Desativar" : "Reativar"}</Button>,
        ])}
      />
      <Suspense><InviteModal searchParams={searchParams} /></Suspense>
    </div>
  );
}

async function InviteModal({ searchParams }: { searchParams: PageProps<"/admin/usuarios">["searchParams"] }) {
  const { modal } = await searchParams;
  if (modal !== "convidar") return null;
  return (
    <Modal title="Convidar usuário" closeHref="/admin/usuarios">
      <form className="flex flex-col gap-4">
        <TextField label="Nome" name="nome" required />
        <TextField label="E-mail" name="email" type="email" required />
        <SelectField label="Marca" name="marca_id" options={fxAdminBrands.map((b) => ({ value: b.id, label: b.nome }))} />
        <Button type="submit">Enviar convite</Button>
      </form>
    </Modal>
  );
}
