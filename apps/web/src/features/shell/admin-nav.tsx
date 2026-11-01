"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";

/** Grupos do menu lateral do admin (seção 16.4). */
export const ADMIN_GROUPS = [
  { title: "Clientes", items: [{ href: "/admin/marcas", label: "Marcas" }, { href: "/admin/usuarios", label: "Usuários" }] },
  { title: "Operação", items: [{ href: "/admin/geracoes", label: "Gerações" }, { href: "/admin/custos", label: "Custos" }] },
  { title: "Sistema", items: [{ href: "/admin/configuracoes", label: "Configurações" }] },
] as const;

/**
 * Lista de grupos e itens do admin no estilo App Store Connect (seção 16.4): título do grupo em
 * negrito escuro, itens indentados sem marcador, hairline entre grupos, um item ativo em #5B8C00
 * com pílula clara do mesmo tom.
 * Recebe: nada (lê o caminho). Devolve: a navegação.
 */
export function AdminNavGroups() {
  return <AdminNavGroupsView pathname={usePathname()} />;
}

/** Versão sem hook do menu (também usada como fallback estático do Suspense). */
export function AdminNavGroupsView({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Administração" className="flex flex-col">
      {ADMIN_GROUPS.map((group, i) => (
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
                    className={cn(
                      "ml-3 flex min-h-10 items-center rounded-full px-3 text-[14px]",
                      active ? "bg-brand-pill font-semibold text-brand-text" : "text-text hover:bg-surface",
                    )}
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
