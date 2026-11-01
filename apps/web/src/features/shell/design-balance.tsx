"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Banner } from "@/components/ui/feedback";
import { COPY, fill } from "@/lib/copy";
import { SUPPORT_CONTACT, fxBrand } from "@/features/fixtures";

/**
 * Saldo exibido no topo (critério 8.8). Na fase de design respeita `?saldo=` para as capturas;
 * no épico 8.8 passa a vir de `marcas.saldo_creditos` com atualização em tempo real.
 */
export function BalancePill() {
  const sp = useSearchParams();
  const balance = sp.get("saldo") ?? String(fxBrand.saldo_creditos);
  return (
    <Link href="/creditos" className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold" aria-label={`Saldo: ${balance} créditos`}>
      <span className="size-2 rounded-full bg-brand" aria-hidden />
      <span className="tabular">{balance}</span>
      <span className="font-normal text-text-2">créditos</span>
    </Link>
  );
}

/** Faixa "Conta pausada" (seção 6.3 e 15), exibida em todas as telas da marca pausada. */
export function PausedBanner() {
  const sp = useSearchParams();
  if (sp.get("pausada") !== "1") return null;
  return <Banner tone="warning">{fill(COPY.contaPausada, { contato_suporte: SUPPORT_CONTACT })}</Banner>;
}
