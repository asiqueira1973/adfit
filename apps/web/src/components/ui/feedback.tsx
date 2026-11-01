import Image from "next/image";
import type { ReactNode } from "react";
import { AlertTriangle, Info, Loader2, XCircle, CheckCircle2 } from "lucide-react";
import { cn } from "./cn";

/** Indicador de carregamento (cor "processando", seção 16.2). */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-processing", className)} aria-label="Carregando" />;
}

type BannerTone = "info" | "warning" | "danger" | "success";
const bannerIcon = { info: Info, warning: AlertTriangle, danger: XCircle, success: CheckCircle2 };
const bannerTone: Record<BannerTone, string> = {
  info: "bg-processing/10 text-text",
  warning: "bg-warning/14 text-text",
  danger: "bg-danger/10 text-text",
  success: "bg-success/12 text-text",
};
const bannerIconTone: Record<BannerTone, string> = {
  info: "text-processing",
  warning: "text-warning",
  danger: "text-danger",
  success: "text-success",
};

/**
 * Aviso em faixa (conta pausada, falha, compra cancelada…).
 * Recebe: tom, texto e ação opcional. Devolve: a faixa com papel de status para leitores de tela.
 */
export function Banner({ tone = "info", children, action, className }: { tone?: BannerTone; children: ReactNode; action?: ReactNode; className?: string }) {
  const Icon = bannerIcon[tone];
  return (
    <div role="status" className={cn("flex items-start gap-3 rounded-[14px] px-4 py-3 text-[14px]", bannerTone[tone], className)}>
      <Icon className={cn("mt-0.5 size-4.5 shrink-0", bannerIconTone[tone])} />
      <div className="flex-1">{children}</div>
      {action}
    </div>
  );
}

/**
 * Estado vazio com foto da plataforma (seção 16.3) e texto da seção 15.
 * Recebe: imagem, texto e ação. Devolve: o bloco centralizado.
 */
export function EmptyState({ image, text, action }: { image?: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      {image && (
        <div className="relative aspect-[4/3] w-full max-w-sm overflow-hidden rounded-[14px]">
          <Image src={image} alt="" fill sizes="384px" className="object-cover" />
        </div>
      )}
      <p className="max-w-xs text-[17px] leading-snug text-text">{text}</p>
      {action}
    </div>
  );
}

/** Título de página (Display 28) com subtítulo e ação opcional à direita. */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-text-2">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

/** Barra de progresso linear (0–100). */
export function ProgressBar({ value, tone = "processing" }: { value: number; tone?: "processing" | "success" }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-text-2/15" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-all", tone === "success" ? "bg-success" : "bg-processing")} style={{ width: `${value}%` }} />
    </div>
  );
}
