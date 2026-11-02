"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Coins, House, Shirt, UserRound } from "lucide-react";
import { cn } from "@/components/ui/cn";

/** Abas da marca (seção 10 + MD-17): Início, Produtos, Personagens, Anúncios, Créditos. Rótulos vêm do dicionário (MD-1). */
export type BrandTabLabels = { inicio: string; produtos: string; personagens: string; anuncios: string; creditos: string };

function tabs(l: BrandTabLabels) {
  return [
    { href: "/inicio", label: l.inicio, icon: House },
    { href: "/produtos", label: l.produtos, icon: Shirt },
    // MD-17: catálogo de personagens.
    { href: "/personagens", label: l.personagens, icon: UserRound },
    { href: "/anuncios", label: l.anuncios, icon: Clapperboard },
    { href: "/creditos", label: l.creditos, icon: Coins },
  ];
}

/** Diz se a aba está ativa para o caminho atual (inclui subpáginas). */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Abas no topo para desktop (seção 10). */
export function TopTabs({ labels }: { labels: BrandTabLabels }) {
  return <TopTabsView pathname={usePathname()} labels={labels} />;
}

/** Versão sem hook das abas do topo (também usada como fallback estático do Suspense). */
export function TopTabsView({ pathname, labels }: { pathname: string; labels: BrandTabLabels }) {
  return (
    <nav aria-label={labels.inicio} className="hidden items-center gap-1 md:flex">
      {tabs(labels).map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn("rounded-full px-3.5 py-1.5 text-[14px] font-semibold", isActive(pathname, t.href) ? "bg-surface text-text" : "text-text-2 hover:text-text")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Barra inferior no celular com as 4 abas (seção 10), alvos ≥ 44 px (seção 17). */
export function BottomTabBar({ labels }: { labels: BrandTabLabels }) {
  return <BottomTabBarView pathname={usePathname()} labels={labels} />;
}

/** Versão sem hook da barra inferior (também usada como fallback estático do Suspense). */
export function BottomTabBarView({ pathname, labels }: { pathname: string; labels: BrandTabLabels }) {
  return (
    <nav aria-label={labels.inicio} className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <ul className="grid grid-cols-4">
        {tabs(labels).map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", active ? "text-text" : "text-text-2")}>
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
