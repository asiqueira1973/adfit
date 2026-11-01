"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { setLanguage } from "@/server/auth/actions";
import { cn } from "@/components/ui/cn";

/**
 * Troca do idioma da interface no menu do perfil (emenda MD-1). Grava `perfis.idioma` pela action
 * `setLanguage` e recarrega os dados da página. Recebe: idioma atual, rótulo e nomes dos idiomas.
 */
export function LanguageSwitch({ current, label, names }: { current: "pt_br" | "en"; label: string; names: { pt_br: string; en: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex min-h-11 items-center gap-3 px-4">
      <Languages className="size-4.5 text-text-2" aria-hidden />
      <span className="flex-1 text-[15px]">{label}</span>
      <div role="group" aria-label={label} className="flex rounded-[8px] bg-surface p-0.5">
        {(["pt_br", "en"] as const).map((l) => (
          <button
            key={l}
            type="button"
            disabled={pending}
            aria-pressed={current === l}
            onClick={(e) => {
              // Fecha o menu do perfil (<details>) ao trocar o idioma (bug relatado em 01/11/2026).
              e.currentTarget.closest("details")?.removeAttribute("open");
              start(async () => { await setLanguage(l); router.refresh(); });
            }}
            className={cn("rounded-[6px] px-2 py-1 text-[12px] font-semibold", current === l ? "bg-bg shadow-sm" : "text-text-2")}
          >
            {l === "pt_br" ? "PT" : "EN"}
            <span className="sr-only"> {names[l]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Troca de idioma compacta das telas públicas (pedido do Alexandre, 01/11/2026): "PT | EN" no topo
 * da tela Entrar e Pedir convite, antes do login. Grava o cookie pela mesma action `setLanguage`.
 * Recebe: idioma atual, rótulo e nomes dos idiomas.
 */
export function PublicLanguageSwitch({ current, label, names }: { current: "pt_br" | "en"; label: string; names: { pt_br: string; en: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div role="group" aria-label={label} className="flex items-center rounded-[10px] bg-surface p-0.5">
      <Languages className="mx-1.5 size-4 text-text-2" aria-hidden />
      {(["pt_br", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          aria-pressed={current === l}
          onClick={() => start(async () => { await setLanguage(l); router.refresh(); })}
          className={cn("min-h-9 rounded-[8px] px-2.5 text-[13px] font-semibold", current === l ? "bg-bg shadow-sm" : "text-text-2")}
        >
          {l === "pt_br" ? "PT" : "EN"}
          <span className="sr-only"> {names[l]}</span>
        </button>
      ))}
    </div>
  );
}
