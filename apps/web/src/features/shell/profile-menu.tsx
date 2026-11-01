import { LogOut, MessageSquare, Store } from "lucide-react";
import { MADE_BY } from "@/lib/constants";
import { fill } from "@/lib/copy";
import type { Dictionary, Locale } from "@/lib/i18n";
import { LanguageSwitch } from "./language-switch";
import { MenuLink } from "./menu-link";

/**
 * Menu do perfil (seção 10): avatar com iniciais que abre "Marca", "Enviar feedback" (MD-6), idioma (MD-1), "Sair" e o
 * crédito da Dab Lab (MD-2). Usa <details> nativo; "Sair" é um formulário POST.
 * Recebe: nome do usuário e da marca, idioma e dicionário. Devolve: o menu.
 */
export function ProfileMenu({ userName, brandName, locale, t }: { userName: string; brandName: string; locale: Locale; t: Dictionary }) {
  const initials = userName.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <details className="relative">
      <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full [&::-webkit-details-marker]:hidden" aria-label={t.nav.menuPerfil}>
        <span className="flex size-8 items-center justify-center rounded-full bg-surface text-[13px] font-semibold">{initials}</span>
      </summary>
      <div className="absolute right-0 z-40 mt-1 w-64 overflow-hidden rounded-[14px] border border-hairline bg-bg shadow-lg">
        <div className="border-b border-hairline px-4 py-3">
          <div className="text-[15px] font-semibold">{userName}</div>
          <div className="text-[13px] text-text-2">{brandName}</div>
        </div>
        <MenuLink href="/marca" className="flex min-h-11 items-center gap-3 px-4 text-[15px] hover:bg-surface">
          <Store className="size-4.5 text-text-2" /> {t.nav.marca}
        </MenuLink>
        <MenuLink href="/feedback" withOrigin className="flex min-h-11 items-center gap-3 px-4 text-[15px] hover:bg-surface">
          <MessageSquare className="size-4.5 text-text-2" /> {t.feedback.menu}
        </MenuLink>
        <LanguageSwitch current={locale} label={t.nav.idioma} names={t.idiomas} />
        <form action="/sair" method="post">
          <button type="submit" className="flex min-h-11 w-full items-center gap-3 px-4 text-[15px] text-danger hover:bg-surface">
            <LogOut className="size-4.5" /> {t.nav.sair}
          </button>
        </form>
        <div className="border-t border-hairline px-4 py-2.5 text-[12px] text-text-2">{fill(t.copy.feitoPor, { estudio: MADE_BY })}</div>
      </div>
    </details>
  );
}
