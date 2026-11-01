import { Suspense } from "react";
import { UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/table";
import { InviteUserForm, ToggleUserButton } from "@/features/admin/admin-forms";
import { listBrandsForAdmin } from "@/server/admin/brands";
import { adminContext } from "@/server/admin/context";
import { listUsers } from "@/server/admin/users";

/**
 * Tela [Admin] Usuários (seção 10): todos os usuários com marca e status; "Convidar" (e-mail, nome,
 * marca) e desativar/reativar (critério 8.2). `?modal=convidar`.
 */
export default function AdminUsersPage({ searchParams }: PageProps<"/admin/usuarios">) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-[14px] bg-surface" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/usuarios">["searchParams"] }) {
  const { t, profile } = await adminContext();
  const { modal } = await searchParams;
  const [users, brands] = await Promise.all([listUsers(), listBrandsForAdmin()]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.admin.usuariosTitulo} action={<ButtonLink href="?modal=convidar" className="px-3"><UserPlus className="size-4.5" /> {t.admin.convidar}</ButtonLink>} />
      {users.length === 0 ? (
        <EmptyState text={t.admin.nenhumUsuario} />
      ) : (
        <DataTable
          head={[t.admin.colNome, t.admin.colEmail, t.admin.marcaCampo, t.admin.colStatus, ""]}
          rows={users.map((u) => [
            <span key="n" className="font-semibold">{u.nome}</span>, u.email, u.marcaNome ?? t.nav.admin,
            <Badge key="s" tone={u.ativo ? "success" : "neutral"}>{u.ativo ? t.admin.ativo : t.admin.desativado}</Badge>,
            <ToggleUserButton key="a" t={t} id={u.id} ativo={u.ativo} disabled={u.id === profile.id} />,
          ])}
        />
      )}
      {modal === "convidar" && (
        <Modal title={t.admin.convidarUsuario} closeHref="/admin/usuarios">
          <InviteUserForm t={t} brands={brands.map((b) => ({ id: b.id, nome: b.nome }))} closeHref="/admin/usuarios" />
        </Modal>
      )}
    </div>
  );
}
