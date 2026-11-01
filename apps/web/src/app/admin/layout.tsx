import { Suspense, type ReactNode } from "react";
import { AdminShell } from "@/features/shell/admin-shell";
import { getDictionary } from "@/lib/i18n";
import { requireAdmin } from "@/server/auth/profile";
import { Banner } from "@/components/ui/feedback";
import { providerOutOfCredits } from "@/server/higgsfield/provider-health";

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
  // Saldo da Higgsfield esgotado: faixa em todas as telas do admin (pedido do Alexandre, 01/11/2026).
  const outOfCredits = await providerOutOfCredits();
  return (
    <AdminShell userName={profile.nome} locale={profile.idioma} t={t}>
      {outOfCredits && <div className="mb-5"><Banner tone="danger">{t.relatorios.saldoHiggsfieldEsgotado}</Banner></div>}
      {children}
    </AdminShell>
  );
}
