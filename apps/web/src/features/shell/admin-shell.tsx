import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { LogOut, Menu } from "lucide-react";
import { APP_NAME, MADE_BY } from "@/lib/constants";
import { COPY, fill } from "@/lib/copy";
import { AdminNavGroups, AdminNavGroupsView } from "./admin-nav";

/** Ambiente exibido no selo do rodapé (seção 16.4): "prod" na produção da Vercel, senão "dev". */
function environmentLabel(): "dev" | "prod" {
  return process.env.VERCEL_ENV === "production" ? "prod" : "dev";
}

/** Rodapé do menu: usuário, sair e selo de ambiente. */
function SidebarFooter({ userName }: { userName: string }) {
  const env = environmentLabel();
  return (
    <div className="flex items-center gap-2 border-t border-hairline px-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold">{userName}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-text-2">
          <span className="rounded-[6px] border border-hairline px-1.5 font-medium uppercase tracking-wide">{env}</span>
          {fill(COPY.feitoPor, { estudio: MADE_BY })}
        </div>
      </div>
      <Link href="/sair" className="flex size-11 items-center justify-center rounded-full text-text-2 hover:bg-surface" aria-label="Sair">
        <LogOut className="size-4.5" />
      </Link>
    </div>
  );
}

/**
 * Casca do painel do admin: menu lateral fixo no desktop (seção 16.4) e, no celular,
 * barra superior com o mesmo menu num painel recolhível.
 * Recebe: nome do admin e o conteúdo. Devolve: o layout.
 */
export function AdminShell({ userName, children }: { userName: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-hairline bg-bg md:flex">
        <div className="px-6 pb-2 pt-6 text-[17px] font-bold tracking-tight">
          {APP_NAME} <span className="font-normal text-text-2">Admin</span>
        </div>
        <div className="flex-1 overflow-y-auto px-3">
          <Suspense fallback={<AdminNavGroupsView pathname="" />}><AdminNavGroups /></Suspense>
        </div>
        <SidebarFooter userName={userName} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <details className="sticky top-0 z-30 border-b border-hairline bg-bg/90 backdrop-blur-xl md:hidden">
          <summary className="flex h-14 cursor-pointer list-none items-center justify-between px-4 [&::-webkit-details-marker]:hidden">
            <span className="text-[17px] font-bold tracking-tight">
              {APP_NAME} <span className="font-normal text-text-2">Admin</span>
            </span>
            <span className="flex size-11 items-center justify-center" aria-label="Abrir menu"><Menu className="size-5" /></span>
          </summary>
          <div className="border-t border-hairline px-3">
            <Suspense fallback={<AdminNavGroupsView pathname="" />}><AdminNavGroups /></Suspense>
            <SidebarFooter userName={userName} />
          </div>
        </details>
        <main className="w-full max-w-6xl flex-1 px-4 py-6 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}
