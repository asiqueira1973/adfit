"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Banner, Spinner } from "@/components/ui/feedback";
import { cn } from "@/components/ui/cn";
import { fill } from "@/lib/copy";
import { formatMoney, typicalAds } from "@/lib/format";
import { callApi } from "@/features/admin/api";

type Pkg = { id: string; nome: string; creditos: number; preco_centavos: number; moeda: string };

/**
 * Escolha de pacote e "Pagar" (critério 8.9): chama POST /api/creditos/checkout e redireciona
 * para a página hospedada da Stripe, mostrando "Abrindo o pagamento seguro…" enquanto isso.
 * Recebe: pacotes ativos ordenados, locale Intl e textos. Devolve: a lista e o botão.
 */
export function PackagePicker({
  packages,
  intl,
  labels,
}: {
  packages: Pkg[];
  intl: string;
  labels: { pagar: string; abrindo: string; rende: string; creditos: string; erro: string };
}) {
  const [selected, setSelected] = useState(packages[0]?.id);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string>();

  async function pay() {
    if (!selected) return;
    setOpening(true);
    setError(undefined);
    const r = await callApi<{ url: string }>("POST", "/api/creditos/checkout", { pacote_id: selected });
    if (r.ok) {
      window.location.assign(r.data.url);
      return;
    }
    setOpening(false);
    setError(r.mensagem || labels.erro);
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label={labels.pagar} className="flex flex-col gap-3">
        {packages.map((p) => {
          const active = selected === p.id;
          return (
            <label key={p.id} className={cn("flex cursor-pointer items-center gap-4 rounded-[14px] bg-surface p-5 outline-2 -outline-offset-2", active ? "outline outline-text" : "outline-transparent")}>
              <input type="radio" name="pacote" value={p.id} checked={active} onChange={() => setSelected(p.id)} className="sr-only" />
              <div className="flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="tabular text-[34px] font-bold leading-none tracking-tight">{p.creditos}</span>
                  <span className="text-[15px] text-text-2">{labels.creditos}</span>
                </div>
                <div className="mt-1.5 text-[14px] text-text-2">{fill(labels.rende, { n: typicalAds(p.creditos) })}</div>
              </div>
              <div className="text-right">
                <div className="tabular text-[20px] font-semibold">{formatMoney(p.preco_centavos, p.moeda, intl)}</div>
                <span className={cn("ml-auto mt-2 flex size-6 items-center justify-center rounded-full border", active ? "border-text bg-text text-bg" : "border-text-2/40")}>
                  {active && <Check className="size-3.5" strokeWidth={3} />}
                </span>
              </div>
            </label>
          );
        })}
      </div>
      {error && <Banner tone="danger">{error}</Banner>}
      <Button type="button" disabled={opening || !selected} onClick={pay} className="h-13 text-[17px]">
        {opening ? (<><Spinner className="text-text-2" /> {labels.abrindo}</>) : labels.pagar}
      </Button>
    </div>
  );
}
