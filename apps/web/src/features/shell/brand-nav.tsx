"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Coins, House, Shirt } from "lucide-react";
import { cn } from "@/components/ui/cn";

/** Abas da marca (seção 10): Início, Produtos, Anúncios, Créditos. */
export const BRAND_TABS = [
  { href: "/inicio", label: "Início", icon: House },
  { href: "/produtos", label: "Produtos", icon: Shirt },
  { href: "/anuncios", label: "Anúncios", icon: Clapperboard },
  { href: "/creditos", label: "Créditos", icon: Coins },
] as const;

/** Diz se a aba está ativa para o caminho atual (inclui subpáginas). */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Abas no topo para desktop (seção 10: "barra superior no desktop").
 * Recebe: nada (lê o caminho atual). Devolve: a navegação horizontal.
 */
export function TopTabs() {
  return <TopTabsView pathname={usePathname()} />;
}

/** Versão sem hook das abas do topo (também usada como fallback estático do Suspense). */
export function TopTabsView({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
      {BRAND_TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-[14px] font-semibold",
            isActive(pathname, t.href) ? "bg-surface text-text" : "text-text-2 hover:text-text",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Barra inferior no celular com as 4 abas (seção 10), alvos ≥ 44 px (seção 17).
 * Recebe: nada. Devolve: a barra fixa (some no desktop).
 */
export function BottomTabBar() {
  return <BottomTabBarView pathname={usePathname()} />;
}

/** Versão sem hook da barra inferior (também usada como fallback estático do Suspense). */
export function BottomTabBarView({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="grid grid-cols-4">
        {BRAND_TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", active ? "text-text" : "text-text-2")}
              >
                <Icon className="size-6" strokeWidth={active ? 2.2 : 1.7} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
