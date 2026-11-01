import type { ReactNode } from "react";
import { cn } from "./cn";

export type Tone = "success" | "warning" | "danger" | "processing" | "neutral";

const tones: Record<Tone, string> = {
  success: "text-success bg-success/12",
  warning: "text-warning bg-warning/14",
  danger: "text-danger bg-danger/12",
  processing: "text-processing bg-processing/12",
  neutral: "text-text-2 bg-text-2/12",
};

/**
 * Selo de status com cor semântica (seção 16.2: cores só para significado; o verde-limão nunca é status).
 * Recebe: tom e texto. Devolve: o selo.
 */
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold", tones[tone], className)}>
      {tone === "processing" && <span className="size-1.5 animate-pulse rounded-full bg-processing" />}
      {children}
    </span>
  );
}
