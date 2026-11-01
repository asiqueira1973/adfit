"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, CostButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Banner, Spinner } from "@/components/ui/feedback";
import { TextArea } from "@/components/ui/field";
import { cn } from "@/components/ui/cn";
import { COPY } from "@/lib/copy";
import { fxPrices } from "@/features/fixtures";

export type SheetState = "sem_ficha" | "gerando" | "aguardando" | "aprovada" | "falhou";

/**
 * Área da ficha de produto (seção 10 e épico 8.4): gerar, acompanhar, aprovar, refazer com
 * instrução e voltar para versão anterior (sem custo). Fase de design: estado vem da URL.
 * Recebe: estado, saldo e se a marca está pausada. Devolve: o cartão da ficha.
 */
export function SheetPanel({ state, balance, paused }: { state: SheetState; balance: number; paused: boolean }) {
  const [redo, setRedo] = useState(false);
  const [version, setVersion] = useState(2);
  const versions = state === "aguardando" || state === "aprovada" ? [1, 2] : [];

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-semibold">Ficha do produto</h2>
        {state === "aprovada" && version === 2 && <Badge tone="success">Aprovada</Badge>}
        {state === "aguardando" && <Badge tone="warning">Confira</Badge>}
        {state === "gerando" && <Badge tone="processing">Preparando</Badge>}
      </div>

      {state === "sem_ficha" && (
        <>
          <p className="text-[15px] text-text-2">A ficha é uma imagem limpa da peça (frente, costas e logo). Ela garante que a peça saia igual nos anúncios.</p>
          <CostButton label="Gerar ficha" cost={fxPrices.gerar_ficha} balance={balance} paused={paused} />
        </>
      )}

      {state === "gerando" && (
        <div className="flex flex-col items-center gap-3 rounded-[10px] bg-bg px-4 py-10 text-center">
          <Spinner className="size-7" />
          <p className="max-w-xs text-[15px]">{COPY.fichaGerando}</p>
        </div>
      )}

      {state === "falhou" && (
        <>
          <Banner tone="danger">{COPY.falhaGeral}</Banner>
          <CostButton label="Gerar ficha" cost={fxPrices.gerar_ficha} balance={balance} paused={paused} />
        </>
      )}

      {(state === "aguardando" || state === "aprovada") && (
        <>
          <div className="relative aspect-[16/9] overflow-hidden rounded-[10px] bg-[#EDEDED]">
            <Image src="/fixtures/ficha.jpg" alt="Ficha: frente, costas e detalhe do logo" fill sizes="(max-width: 768px) 100vw, 640px" className="object-contain" />
          </div>
          {state === "aguardando" && <p className="text-[15px]">{COPY.fichaPronta}</p>}
          <div className="flex gap-2">
            {versions.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVersion(v)}
                className={cn("flex min-h-11 items-center rounded-full px-3.5 text-[13px] font-semibold", version === v ? "bg-text text-bg" : "bg-bg text-text")}
              >
                Versão {v}
              </button>
            ))}
          </div>
          {redo ? (
            <div className="flex flex-col gap-3">
              <TextArea label={COPY.fichaRefazerCampo} name="instrucao" rows={3} maxChars={200} placeholder="Ex.: o logo é menor e fica do lado esquerdo" />
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="ghost" onClick={() => setRedo(false)}>Cancelar</Button>
                <CostButton label="Refazer" cost={fxPrices.refazer_ficha} balance={balance} paused={paused} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {!(state === "aprovada" && version === 2) && (
                <Button type="button"><Check className="size-4.5" /> Aprovar ficha</Button>
              )}
              <Button type="button" variant="secondary" onClick={() => setRedo(true)}>
                <RotateCcw className="size-4" /> Refazer · 1 crédito
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
