"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";

/** Rótulos do menu do admin (do dicionário, MD-1). */
export type AdminNavLabels = {
  adminGrupoClientes: string; adminGrupoOperacao: string; adminGrupoSistema: string;
  adminMarcas: string; adminUsuarios: string; adminGeracoes: string; adminCustos: string; adminConfiguracoes: string; adminFeedbacks: string; adminPedidos: string;
};

/** Grupos do menu lateral do admin (seção 16.4). */
function groups(l: AdminNavLabels) {
  return [
    { title: l.adminGrupoClientes, items: [{ href: "/admin/marcas", label: l.adminMarcas }, { href: "/admin/usuarios", label: l.adminUsuarios }, { href: "/admin/pedidos", label: l.adminPedidos }] },
    { title: l.adminGrupoOperacao, items: [{ href: "/admin/geracoes", label: l.adminGeracoes }, { href: "/admin/custos", label: l.adminCustos }, { href: "/admin/feedbacks", label: l.adminFeedbacks }] },
    { title: l.adminGrupoSistema, items: [{ href: "/admin/configuracoes", label: l.adminConfiguracoes }] },
  ];
}

/**
 * Menu do admin estilo App Store Connect (seção 16.4): título do grupo em negrito escuro, itens
 * indentados sem marcador, hairline entre grupos, item ativo em #5B8C00 com pílula clara.
 */
export function AdminNavGroups({ labels }: { labels: AdminNavLabels }) {
  return <AdminNavGroupsView pathname={usePathname()} labels={labels} />;
}

/** Versão sem hook do menu (também usada como fallback estático do Suspense). */
export function AdminNavGroupsView({ pathname, labels }: { pathname: string; labels: AdminNavLabels }) {
  return (
    <nav aria-label="Admin" className="flex flex-col">
      {groups(labels).map((group, i) => (
        <div key={group.title} className={cn("py-4", i > 0 && "border-t border-hairline")}>
          <div className="px-3 pb-1.5 text-[14px] font-bold text-text">{group.title}</div>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn("ml-3 flex min-h-10 items-center rounded-full px-3 text-[14px]", active ? "bg-brand-pill font-semibold text-brand-text" : "text-text hover:bg-surface")}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
