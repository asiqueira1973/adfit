"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";
import { SelectField, TextArea, TextField } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { COPY } from "@/lib/copy";

/**
 * Modal "Lançar créditos" do admin (critério 8.2 e regra 11.2.6): `compra` exige valor pago > 0 e
 * moeda; `bonus` e `ajuste_manual` exigem observação; ajuste negativo que deixaria saldo < 0 é
 * recusado com a copy da seção 15. Fase de design: `showNegativeError` simula a recusa.
 * Recebe: se deve mostrar o erro. Devolve: o formulário (envia para `POST /api/admin/creditos` no 8.2).
 */
export function LaunchCreditsForm({ showNegativeError }: { showNegativeError?: boolean }) {
  const [tipo, setTipo] = useState(showNegativeError ? "ajuste_manual" : "compra");
  return (
    <form className="flex flex-col gap-4">
      <Segmented name="tipo" label="Tipo" value={tipo} onChange={setTipo} options={[{ value: "compra", label: "Compra" }, { value: "bonus", label: "Bônus" }, { value: "ajuste_manual", label: "Ajuste" }]} />
      <TextField
        label="Quantidade de créditos"
        name="quantidade"
        type="number"
        inputMode="numeric"
        defaultValue={showNegativeError ? -60 : 100}
        hint={tipo === "ajuste_manual" ? "Use número negativo para tirar créditos." : undefined}
      />
      {tipo === "compra" && (
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <TextField label="Valor pago" name="valor_pago" inputMode="decimal" placeholder="0,00" required />
          <SelectField label="Moeda" name="moeda" defaultValue="brl" options={[{ value: "brl", label: "BRL" }, { value: "usd", label: "USD" }, { value: "eur", label: "EUR" }]} />
        </div>
      )}
      <TextArea label={tipo === "compra" ? "Observação (opcional)" : "Observação (obrigatória)"} name="observacao" rows={2} required={tipo !== "compra"} defaultValue={showNegativeError ? "Correção de lançamento duplicado" : ""} />
      {showNegativeError && <Banner tone="danger">{COPY.ajusteNegativoInvalido}</Banner>}
      <Button type="submit">Lançar</Button>
    </form>
  );
}
