"use client";

import { Check } from "lucide-react";
import { cn } from "@/components/ui/cn";
import type { Dictionary } from "@/lib/i18n";
import { REDO_SHORTCUTS, type RedoKind } from "@/lib/redo-shortcuts";

/**
 * Atalhos de refação (pedido do Alexandre, 01/11/2026): botões com os problemas mais comuns, que viram
 * instruções fixas no servidor (sem interpretação). Usado na ficha, na imagem da cena e na cena em vídeo.
 * Recebe: tipo, códigos marcados, troca e textos. Devolve: a lista de botões.
 */
export function RedoShortcuts({ kind, value, onChange, t }: { kind: RedoKind; value: string[]; onChange: (next: string[]) => void; t: Dictionary["refazer"] }) {
  const labels = t[kind] as Record<string, string>;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[15px] font-medium">{t.titulo}</legend>
      <div className="flex flex-wrap gap-2">
        {REDO_SHORTCUTS[kind].map((code) => {
          const on = value.includes(code);
          return (
            <button
              key={code}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((c) => c !== code) : [...value, code])}
              className={cn("flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-left text-[14px] font-medium", on ? "bg-text text-bg" : "bg-bg hover:bg-surface")}
            >
              {on && <Check className="size-3.5 shrink-0" />} {labels[code]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
