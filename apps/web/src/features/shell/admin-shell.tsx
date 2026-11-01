import { Suspense, type ReactNode } from "react";
import { LogOut, Menu } from "lucide-react";
import { APP_NAME, MADE_BY } from "@/lib/constants";
import { fill } from "@/lib/copy";
import type { Dictionary, Locale } from "@/lib/i18n";
import { AdminNavGroups, AdminNavGroupsView } from "./admin-nav";
import { LanguageSwitch } from "./language-switch";

/** Ambiente exibido no selo do rodapé (seção 16.4): "prod" na produção da Vercel, senão "dev". */
function environmentLabel(): "dev" | "prod" {
  return process.env.VERCEL_ENV === "production" ? "prod" : "dev";
}

/** Rodapé do menu: usuário, idioma (MD-1), sair (POST), selo de ambiente e crédito Dab Lab (MD-2). */
function SidebarFooter({ userName, locale, t }: { userName: string; locale: Locale; t: Dictionary }) {
  return (
    <div className="border-t border-hairline">
      <div className="-mx-1"><LanguageSwitch current={locale} label={t.nav.idioma} names={t.idiomas} /></div>
      <div className="flex items-center gap-2 px-3 pb-3 pt-1">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold">{userName}</div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-text-2">
            <span className="rounded-[6px] border border-hairline px-1.5 font-medium uppercase tracking-wide">{environmentLabel()}</span>
            {fill(t.copy.feitoPor, { estudio: MADE_BY })}
          </div>
        </div>
        <form action="/sair" method="post">
          <button type="submit" className="flex size-11 items-center justify-center rounded-full text-text-2 hover:bg-surface" aria-label={t.nav.sair}>
            <LogOut className="size-4.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Casca do painel do administrador: menu lateral fixo no desktop (seção 16.4) e, no celular,
 * barra superior com o mesmo menu recolhível. Recebe: nome do admin, idioma, dicionário e conteúdo.
 */
export function AdminShell({ userName, locale, t, children }: { userName: string; locale: Locale; t: Dictionary; children: ReactNode }) {
  const nav = <Suspense fallback={<AdminNavGroupsView pathname="" labels={t.nav} />}><AdminNavGroups labels={t.nav} /></Suspense>;
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-hairline bg-bg md:flex">
        <div className="px-6 pb-2 pt-6 text-[17px] font-bold tracking-tight">
          {APP_NAME} <span className="font-normal text-text-2">{t.nav.admin}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-3">{nav}</div>
        <SidebarFooter userName={userName} locale={locale} t={t} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <details className="sticky top-0 z-30 border-b border-hairline bg-bg/90 backdrop-blur-xl md:hidden">
          <summary className="flex h-14 cursor-pointer list-none items-center justify-between px-4 [&::-webkit-details-marker]:hidden">
            <span className="text-[17px] font-bold tracking-tight">
              {APP_NAME} <span className="font-normal text-text-2">{t.nav.admin}</span>
            </span>
            <span className="flex size-11 items-center justify-center" aria-label={t.nav.abrirMenu}><Menu className="size-5" /></span>
          </summary>
          <div className="border-t border-hairline px-3">
            {nav}
            <SidebarFooter userName={userName} locale={locale} t={t} />
          </div>
        </details>
        <main className="w-full max-w-6xl flex-1 px-4 py-6 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}
