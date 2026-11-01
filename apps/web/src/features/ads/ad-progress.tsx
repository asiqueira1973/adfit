import { Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/feedback";
import { CENA_PAPEL } from "@/lib/labels";

export type StepState = "feito" | "andamento" | "espera" | "falhou";

/**
 * Lista de progresso por etapa (seção 10: "progresso por cena" e etapa "Montando o vídeo").
 * Recebe: título e etapas com estado (e dica para a que falhou). Devolve: o cartão de progresso.
 */
export function AdProgress({ title, steps }: { title: string; steps: Array<{ label: string; state: StepState; hint?: string }> }) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <p className="text-[17px] font-semibold leading-snug">{title}</p>
      <ul className="flex flex-col gap-3">
        {steps.map((s) => (
          <li key={s.label} className="flex items-start gap-3 text-[15px]">
            <span className="flex size-6 items-center justify-center">
              {s.state === "feito" && <span className="flex size-5 items-center justify-center rounded-full bg-success text-white"><Check className="size-3.5" strokeWidth={3} /></span>}
              {s.state === "andamento" && <Spinner />}
              {s.state === "espera" && <span className="size-2 rounded-full bg-text-2/40" />}
              {s.state === "falhou" && <span className="flex size-5 items-center justify-center rounded-full bg-danger text-white"><X className="size-3.5" strokeWidth={3} /></span>}
            </span>
            <span className={s.state === "espera" ? "text-text-2" : ""}>
              {s.label}
              {/* Etapa que falhou explica o que aconteceu (antes era só um X; relato de 01/11/2026). */}
              {s.state === "falhou" && s.hint && <span className="block text-[13px] text-text-2">{s.hint}</span>}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Rótulo "Cena n · papel" para as listas de progresso. */
export function sceneLabel(n: 1 | 2 | 3): string {
  return `Cena ${n} · ${CENA_PAPEL[n]}`;
}
