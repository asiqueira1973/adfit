import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { APP_NAME } from "@/lib/constants";
import { fill } from "@/lib/copy";
import type { Dictionary, Locale } from "@/lib/i18n";
import { BottomTabBar, BottomTabBarView, TopTabs, TopTabsView } from "./brand-nav";
import { ProfileMenu } from "./profile-menu";

/**
 * Casca das telas da marca: barra superior com saldo (critério 8.8), abas no desktop, barra
 * inferior no celular, menu do perfil e faixa de aviso (ex.: conta pausada, seção 6.3).
 * Recebe: saldo, nomes, idioma, dicionário, faixa opcional e o conteúdo. Devolve: o layout.
 */
export function BrandShell({ balance, userName, brandName, locale, t, banner, children }: { balance: number; userName: string; brandName: string; locale: Locale; t: Dictionary; banner?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-hairline bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/inicio" className="text-[17px] font-bold tracking-tight">{APP_NAME}</Link>
          <Suspense fallback={<TopTabsView pathname="" labels={t.nav} />}><TopTabs labels={t.nav} /></Suspense>
          <div className="flex items-center gap-1">
            <Link href="/creditos" className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold" aria-label={fill(t.nav.saldoAria, { n: balance })}>
              <span className="size-2 rounded-full bg-brand" aria-hidden />
              <span className="tabular">{balance}</span>
              <span className="font-normal text-text-2">{t.nav.creditosUnidade}</span>
            </Link>
            <ProfileMenu userName={userName} brandName={brandName} locale={locale} t={t} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 md:pb-12">
        {banner && <div className="mb-4">{banner}</div>}
        {children}
      </main>
      <Suspense fallback={<BottomTabBarView pathname="" labels={t.nav} />}><BottomTabBar labels={t.nav} /></Suspense>
    </div>
  );
}

/** Esqueleto da casca enquanto a sessão carrega (fallback do Suspense do layout). */
export function BrandShellSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="h-14 border-b border-hairline" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5" aria-busy="true" />
    </div>
  );
}
