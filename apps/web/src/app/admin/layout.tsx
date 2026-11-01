import { AdminShell } from "@/features/shell/admin-shell";
import { fxAdmin } from "@/features/fixtures";

/**
 * Layout do painel do administrador (seção 16.4). Fase de design com fixtures; no épico 8.1 o
 * proxy exige sessão de `admin_plataforma` e toda rota de admin confere `eh_admin()` (seção 13).
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell userName={fxAdmin.nome}>{children}</AdminShell>;
}
