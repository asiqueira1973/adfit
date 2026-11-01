import { Suspense, type ReactNode } from "react";
import { AdminShell } from "@/features/shell/admin-shell";
import { getDictionary } from "@/lib/i18n";
import { requireAdmin } from "@/server/auth/profile";

/**
 * Layout do painel do administrador (seção 16.4). Exige `admin_plataforma` ativo no servidor
 * (seção 13: esconder o menu não é permissão).
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <AdminFrame>{children}</AdminFrame>
    </Suspense>
  );
}

async function AdminFrame({ children }: { children: ReactNode }) {
  const profile = await requireAdmin();
  const t = getDictionary(profile.idioma);
  return <AdminShell userName={profile.nome} locale={profile.idioma} t={t}>{children}</AdminShell>;
}
