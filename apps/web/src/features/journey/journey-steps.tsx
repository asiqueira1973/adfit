import { Check } from "lucide-react";
import { cn } from "@/components/ui/cn";
import type { Dictionary } from "@/lib/i18n";

export type JourneyStep = "fotos" | "ficha" | "escolhas" | "cenas" | "video";
const PREPARE: JourneyStep[] = ["fotos", "ficha"];
const AD: JourneyStep[] = ["escolhas", "cenas", "video"];
const ORDER: JourneyStep[] = [...PREPARE, ...AD];

/**
 * Trilha de etapas (pedido do Alexandre, 01/11/2026: o usuário precisa entender que é um fluxo).
 * Duas fases: "Preparar a peça" (fotos e ficha, uma vez por produto) e "Criar o anúncio" (escolhas,
 * cenas, vídeo, quantas vezes quiser). Etapas antes da atual aparecem como feitas.
 * Recebe: etapa atual (ou "concluido") e textos. Devolve: a trilha.
 */
export function JourneySteps({ current, t }: { current: JourneyStep | "concluido"; t: Dictionary["jornada"] }) {
  const index = current === "concluido" ? ORDER.length : ORDER.indexOf(current);
  const phase = (title: string, hint: string, steps: JourneyStep[], active: boolean) => (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-2 rounded-[12px] p-3", active ? "bg-brand-pill" : "bg-surface")}>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[13px] font-bold">{title}</span>
        <span className="truncate text-[12px] text-text-2">· {hint}</span>
      </div>
      <ol className="flex items-center gap-1.5">
        {steps.map((s, i) => {
          const pos = ORDER.indexOf(s);
          const state = pos < index ? "feito" : pos === index ? "agora" : "depois";
          return (
            <li key={s} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <span className="h-px w-3 shrink-0 bg-text-2/30" />}
              <span
                aria-current={state === "agora" ? "step" : undefined}
                className={cn(
                  "flex min-h-7 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold",
                  state === "feito" && "bg-success/15 text-success",
                  state === "agora" && "bg-text text-bg",
                  state === "depois" && "bg-bg text-text-2",
                )}
              >
                {state === "feito" && <Check className="size-3" strokeWidth={3} />}
                <span className="truncate">{t.passos[s]}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
  return (
    <nav aria-label={t.titulo} className="flex flex-col gap-2 sm:flex-row">
      {phase(t.fasePreparar, t.fasePrepararDica, PREPARE, index < PREPARE.length)}
      {phase(t.faseAnuncio, t.faseAnuncioDica, AD, index >= PREPARE.length && index < ORDER.length)}
    </nav>
  );
}
