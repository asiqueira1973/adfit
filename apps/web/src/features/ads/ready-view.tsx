"use client";

import { useState } from "react";
import { Download, Pencil, RotateCcw } from "lucide-react";
import { Button, CostButton } from "@/components/ui/button";
import { ListGroup } from "@/components/ui/card";
import { Banner } from "@/components/ui/feedback";
import { TextArea, TextField } from "@/components/ui/field";
import { cn } from "@/components/ui/cn";
import { COPY } from "@/lib/copy";
import { CENA_PAPEL } from "@/lib/labels";
import { fxBrand, fxPrices, fxScenes } from "@/features/fixtures";

/**
 * Estado "pronto" do anúncio (seção 10 e épico 8.7): player com controles nativos, "Baixar vídeo",
 * "Editar textos" → "Atualizar vídeo · grátis", "Refazer cena · 4 créditos" por cena e troca para
 * versão anterior do clipe (remontagem grátis).
 * Recebe: formato, saldo e pausada. Devolve: a visão do vídeo pronto.
 */
export function ReadyView({ vertical, balance, paused }: { vertical: boolean; balance: number; paused: boolean }) {
  const [editing, setEditing] = useState(false);
  const [redoScene, setRedoScene] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,360px)_1fr] md:items-start md:gap-8">
      <div className="flex flex-col gap-3">
        <Banner tone="success">{COPY.videoPronto}</Banner>
        <video
          controls
          playsInline
          poster="/fixtures/cena-3.jpg"
          className={cn("w-full rounded-[14px] bg-black object-cover", vertical ? "aspect-[9/16]" : "aspect-video")}
          aria-label="Vídeo do anúncio"
        />
        <Button type="button"><Download className="size-4.5" /> Baixar vídeo</Button>
      </div>

      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-bold tracking-tight">Textos</h2>
            {!editing && <Button type="button" variant="ghost" className="px-2" onClick={() => setEditing(true)}><Pencil className="size-4" /> Editar textos</Button>}
          </div>
          {editing ? (
            <div className="flex flex-col gap-4">
              {fxScenes.filter((s) => s.texto_tela).map((s) => (
                <TextArea key={s.ordem} label={`Cena ${s.ordem} · ${CENA_PAPEL[s.ordem]}`} rows={2} defaultValue={s.texto_tela ?? ""} hint="Até 2 linhas de 32 caracteres." />
              ))}
              <TextField label="Chamada final (CTA)" maxChars={40} defaultValue={fxBrand.cta_padrao} />
              <TextField label="Oferta" maxChars={40} defaultValue="20% OFF esta semana" />
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
                <CostButton label="Atualizar vídeo" cost={fxPrices.remontar_texto} balance={balance} paused={paused} />
              </div>
            </div>
          ) : (
            <ListGroup>
              {fxScenes.filter((s) => s.texto_tela).map((s) => (
                <div key={s.ordem} className="px-4 py-3">
                  <div className="text-[12px] font-medium text-text-2">Cena {s.ordem}</div>
                  <div className="whitespace-pre-line text-[15px]">{s.texto_tela}</div>
                </div>
              ))}
              <div className="px-4 py-3">
                <div className="text-[12px] font-medium text-text-2">Final</div>
                <div className="text-[15px]">{fxBrand.cta_padrao} · 20% OFF esta semana</div>
              </div>
            </ListGroup>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-[22px] font-bold tracking-tight">Cenas</h2>
          <div className="flex flex-col gap-3">
            {fxScenes.map((s) => (
              <div key={s.ordem} className="flex flex-col gap-3 rounded-[14px] bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold">Cena {s.ordem} · {CENA_PAPEL[s.ordem]}</div>
                    <div className="truncate text-[13px] text-text-2">{s.descricao}</div>
                  </div>
                </div>
                {s.ordem === 2 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex min-h-9 items-center rounded-full bg-bg px-3 text-[13px] font-semibold">Versão 1</span>
                    <span className="flex min-h-9 items-center rounded-full bg-text px-3 text-[13px] font-semibold text-bg">Versão 2 · no vídeo</span>
                    <Button type="button" variant="ghost" className="min-h-9 px-2 text-[13px]">Voltar para a versão 1 · grátis</Button>
                  </div>
                )}
                {redoScene === s.ordem ? (
                  <div className="flex flex-col gap-3">
                    <TextArea label={COPY.refazerQuadroCampo} rows={2} maxChars={200} placeholder="Ex.: movimento mais lento" />
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="ghost" onClick={() => setRedoScene(null)}>Cancelar</Button>
                      <CostButton label="Refazer cena" cost={fxPrices.refazer_clipe} balance={balance} paused={paused} />
                    </div>
                  </div>
                ) : (
                  <Button type="button" variant="secondary" className="bg-bg" disabled={paused} onClick={() => setRedoScene(s.ordem)}>
                    <RotateCcw className="size-4" /> Refazer cena · 4 créditos
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
