"use client";

import Image from "next/image";
import { useState } from "react";
import { AlertTriangle, Check, RotateCcw } from "lucide-react";
import { Button, CostButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/feedback";
import { TextArea } from "@/components/ui/field";
import { cn } from "@/components/ui/cn";
import { COPY } from "@/lib/copy";
import { CENA_PAPEL } from "@/lib/labels";
import { hasForbiddenTerm } from "@/lib/forbidden-terms";
import { validateScreenText } from "@/lib/text-rules";
import { fxPrices } from "@/features/fixtures";

/**
 * Cartão de cena na aprovação de quadros (seção 10, critérios 8.5/8.6): imagem na proporção do
 * formato, descrição, texto da tela editável (2×32, aviso de termo proibido), versões com
 * "Usar esta" e "Refazer imagem · 1 crédito" com instrução opcional. Aviso de QC em laranja.
 * Recebe: dados da cena, formato, saldo, pausada e se está bloqueado (geração em andamento).
 */
export function SceneCard({
  ordem,
  descricao,
  texto_tela,
  imagem,
  versoes,
  qcAviso,
  vertical,
  balance,
  paused,
  locked,
  generating,
}: {
  ordem: 1 | 2 | 3;
  descricao: string;
  texto_tela: string | null;
  imagem: string;
  versoes: number;
  qcAviso: boolean;
  vertical: boolean;
  balance: number;
  paused: boolean;
  locked?: boolean;
  generating?: boolean;
}) {
  const [text, setText] = useState(texto_tela ?? "");
  const [redo, setRedo] = useState(false);
  const [selected, setSelected] = useState(versoes);
  const error = ordem !== 3 ? validateScreenText(text) : null;

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className={cn("relative w-full bg-text/10", vertical ? "aspect-[9/16]" : "aspect-video")}>
        {generating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-2">
            <Spinner className="size-6" />
            <span className="text-[13px]">Criando a cena…</span>
          </div>
        ) : (
          <Image src={imagem} alt={`Imagem da cena ${ordem}`} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[12px] font-semibold text-white backdrop-blur">
          Cena {ordem} · {CENA_PAPEL[ordem]}
        </span>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {qcAviso && !generating && (
          <div className="flex items-start gap-2 rounded-[10px] bg-warning/14 px-3 py-2 text-[14px]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" /> {COPY.avisoQc}
          </div>
        )}
        <p className="text-[15px] text-text-2">{descricao}</p>

        {versoes > 1 && !generating && (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: versoes }, (_, i) => i + 1).map((v) => (
              <button
                key={v}
                type="button"
                disabled={locked}
                onClick={() => setSelected(v)}
                className={cn("flex min-h-11 items-center gap-1 rounded-full px-3.5 text-[13px] font-semibold", selected === v ? "bg-text text-bg" : "bg-bg")}
              >
                {selected === v && <Check className="size-3.5" />} Versão {v}
              </button>
            ))}
            {selected !== versoes && <Button type="button" variant="secondary" className="min-h-11 text-[13px]">Usar esta</Button>}
          </div>
        )}

        {ordem !== 3 ? (
          <TextArea
            label="Texto na tela"
            rows={2}
            value={text}
            disabled={locked}
            onChange={(e) => setText(e.target.value)}
            hint={error ?? "Até 2 linhas de 32 caracteres."}
            warning={hasForbiddenTerm(text) ? COPY.avisoTextoProibido : undefined}
          />
        ) : (
          <p className="text-[13px] text-text-2">No fim desta cena entram o seu logo e o convite para comprar.</p>
        )}

        {redo ? (
          <div className="flex flex-col gap-3">
            <TextArea label={COPY.refazerQuadroCampo} rows={2} maxChars={200} placeholder="Ex.: mostrar mais o logo" />
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="ghost" onClick={() => setRedo(false)}>Cancelar</Button>
              <CostButton label="Refazer" cost={fxPrices.refazer_quadro} balance={balance} paused={paused} />
            </div>
          </div>
        ) : (
          <Button type="button" variant="secondary" disabled={locked || paused} onClick={() => setRedo(true)}>
            <RotateCcw className="size-4" /> Refazer imagem · 1 crédito
          </Button>
        )}
      </div>
    </Card>
  );
}
