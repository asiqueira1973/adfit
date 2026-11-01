import Link from "next/link";
import type { ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Janela modal acessível controlada pela URL (abre com `?modal=`; fechar volta para `closeHref`).
 * No celular vira folha que sobe de baixo. Recebe: título, link de fechar e conteúdo.
 */
export function Modal({ title, closeHref, children }: { title: string; closeHref: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[18px] bg-bg p-5 shadow-2xl md:max-w-md md:rounded-[18px]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[22px] font-bold tracking-tight">{title}</h2>
          <Link href={closeHref} aria-label="Fechar" className="flex size-11 items-center justify-center rounded-full hover:bg-surface"><X className="size-5" /></Link>
        </div>
        {children}
      </div>
    </div>
  );
}
