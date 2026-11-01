import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { APP_NAME } from "@/lib/constants";
import { BottomTabBar, BottomTabBarView, TopTabs, TopTabsView } from "./brand-nav";
import { ProfileMenu } from "./profile-menu";

/**
 * Casca das telas da marca: barra superior com saldo (critério 8.8: "saldo visível no topo de
 * todas as telas da marca"), abas no desktop, barra inferior no celular e menu do perfil.
 * Recebe: o indicador de saldo, nomes, faixa de aviso e o conteúdo. Devolve: o layout.
 */
export function BrandShell({ balance, userName, brandName, banner, children }: { balance: ReactNode; userName: string; brandName: string; banner?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-hairline bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/inicio" className="text-[17px] font-bold tracking-tight">{APP_NAME}</Link>
          <Suspense fallback={<TopTabsView pathname="" />}><TopTabs /></Suspense>
          <div className="flex items-center gap-1">
            {balance}
            <ProfileMenu userName={userName} brandName={brandName} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 md:pb-12">
        {banner && <div className="mb-4">{banner}</div>}
        {children}
      </main>
      <Suspense fallback={<BottomTabBarView pathname="" />}><BottomTabBar /></Suspense>
    </div>
  );
}
