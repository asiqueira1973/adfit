"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/feedback";
import { cn } from "@/components/ui/cn";
import { COPY, fill } from "@/lib/copy";
import { formatMoney, typicalAds } from "@/lib/format";

type Pkg = { id: string; nome: string; creditos: number; preco_centavos: number; moeda: string };

/**
 * Escolha de pacote e botão "Pagar" (critério 8.9). Fase de design: `opening` mostra o estado
 * "Abrindo o pagamento seguro…"; no épico 8.9 o botão chama `POST /api/creditos/checkout`
 * e redireciona para a URL da Checkout Session.
 * Recebe: pacotes ativos ordenados. Devolve: a lista de pacotes e o botão.
 */
export function PackagePicker({ packages, opening }: { packages: Pkg[]; opening?: boolean }) {
  const [selected, setSelected] = useState(packages[0]?.id);
  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Pacotes" className="flex flex-col gap-3">
        {packages.map((p) => {
          const active = selected === p.id;
          return (
            <label key={p.id} className={cn("flex cursor-pointer items-center gap-4 rounded-[14px] bg-surface p-5 outline-2 -outline-offset-2", active ? "outline outline-text" : "outline-transparent")}>
              <input type="radio" name="pacote" value={p.id} checked={active} onChange={() => setSelected(p.id)} className="sr-only" />
              <div className="flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="tabular text-[34px] font-bold leading-none tracking-tight">{p.creditos}</span>
                  <span className="text-[15px] text-text-2">créditos</span>
                </div>
                <div className="mt-1.5 text-[14px] text-text-2">{fill(COPY.pacoteRende, { n: typicalAds(p.creditos) })}</div>
              </div>
              <div className="text-right">
                <div className="tabular text-[20px] font-semibold">{formatMoney(p.preco_centavos, p.moeda)}</div>
                <span className={cn("ml-auto mt-2 flex size-6 items-center justify-center rounded-full border", active ? "border-text bg-text text-bg" : "border-text-2/40")}>
                  {active && <Check className="size-3.5" strokeWidth={3} />}
                </span>
              </div>
            </label>
          );
        })}
      </div>
      <Button type="button" disabled={opening} className="h-13 text-[17px]">
        {opening ? (<><Spinner className="text-text-2" /> {COPY.indoPagamento}</>) : "Pagar"}
      </Button>
    </div>
  );
}
