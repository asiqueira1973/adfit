import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

/** Cartão de superfície (raio 14 px, seção 16.2). */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-[14px] bg-surface", className)} {...props} />;
}

/**
 * Lista agrupada estilo iOS (seção 16.1): cartão com linhas separadas por hairline.
 * Recebe: título opcional do grupo e as linhas. Devolve: a seção.
 */
export function ListGroup({ title, footer, children, className }: { title?: string; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-2", className)}>
      {title && <h2 className="px-1 text-[13px] font-semibold uppercase tracking-wide text-text-2">{title}</h2>}
      <div className="divide-y divide-hairline overflow-hidden rounded-[14px] bg-surface">{children}</div>
      {footer && <div className="px-1 text-[13px] text-text-2">{footer}</div>}
    </section>
  );
}

/** Linha de lista agrupada com rótulo à esquerda e valor/ação à direita. */
export function ListRow({ label, detail, value, className, children }: { label?: ReactNode; detail?: ReactNode; value?: ReactNode; className?: string; children?: ReactNode }) {
  return (
    <div className={cn("flex min-h-11 items-center gap-3 px-4 py-3", className)}>
      {children ?? (
        <>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px]">{label}</div>
            {detail && <div className="truncate text-[13px] text-text-2">{detail}</div>}
          </div>
          {value !== undefined && <div className="shrink-0 text-[15px] text-text-2">{value}</div>}
        </>
      )}
    </div>
  );
}
