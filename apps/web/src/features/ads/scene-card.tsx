"use client";

import Image from "next/image";
import { AlertTriangle, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/feedback";
import { TextArea } from "@/components/ui/field";
import { cn } from "@/components/ui/cn";
import { fill } from "@/lib/copy";
import type { Dictionary } from "@/lib/i18n";

export type SceneFrame = { id: string; versao: number; status: "gerando" | "pronto" | "descartado" | "falhou"; url: string | null; avisoQc: boolean };
export type SceneView = { id: string; ordem: 1 | 2 | 3; descricao: string; textoTela: string | null; quadroAtualId: string | null; quadros: SceneFrame[] };

/**
 * Cartão de cena na aprovação de quadros (seção 10; critérios 8.5): imagem na proporção do formato,
 * papel da cena, descrição, aviso de QC (regra 11.5), texto da tela editável (2×32; termo proibido
 * só avisa — 11.7). Versões, "Usar esta" e "Refazer imagem" aparecem desabilitados até o 8.6.
 * Recebe: cena, formato, texto atual e seu erro/aviso, se está bloqueado e o dicionário.
 */
export function SceneCard({
  cena,
  vertical,
  text,
  onText,
  textError,
  textWarning,
  locked,
  comTexto,
  t,
}: {
  cena: SceneView;
  vertical: boolean;
  text: string;
  onText: (value: string) => void;
  textError: string | null;
  textWarning: boolean;
  locked: boolean;
  comTexto: boolean;
  t: Pick<Dictionary, "anuncios" | "opcoes" | "copy">;
}) {
  const a = t.anuncios;
  const latest = cena.quadros.at(-1);
  const current = cena.quadros.find((q) => q.id === cena.quadroAtualId) ?? cena.quadros.filter((q) => q.status === "pronto").at(-1) ?? null;
  const generating = !latest || latest.status === "gerando";
  const failed = !generating && latest?.status === "falhou" && !current;
  const ready = cena.quadros.filter((q) => q.status === "pronto");

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className={cn("relative w-full bg-text/10", vertical ? "aspect-[9/16]" : "aspect-video")}>
        {generating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-2">
            <Spinner className="size-6" />
            <span className="text-[13px]">{a.criandoCena}</span>
          </div>
        ) : current?.url ? (
          <Image src={current.url} alt={fill(a.imagemCena, { n: cena.ordem })} fill unoptimized sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[14px] text-text-2">{a.cenaFalhou}</div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[12px] font-semibold text-white backdrop-blur">
          {fill(a.cena, { n: cena.ordem })} · {t.opcoes.papelCena[cena.ordem]}
        </span>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {current?.avisoQc && !generating && (
          <div className="flex items-start gap-2 rounded-[10px] bg-warning/14 px-3 py-2 text-[14px]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" /> {t.copy.avisoQc}
          </div>
        )}
        <p className="text-[15px] text-text-2">{cena.descricao}</p>

        {ready.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {ready.map((q) => (
              <span key={q.id} className={cn("flex min-h-11 items-center gap-1 rounded-full px-3.5 text-[13px] font-semibold", q.id === current?.id ? "bg-text text-bg" : "bg-bg")}>
                {q.id === current?.id && <Check className="size-3.5" />} {fill(a.versao, { n: q.versao })}
              </span>
            ))}
          </div>
        )}

        {cena.ordem !== 3 && !comTexto ? (
          <p className="text-[13px] text-text-2">{a.semTexto}</p>
        ) : cena.ordem !== 3 ? (
          <TextArea
            label={a.textoTela}
            rows={2}
            value={text}
            disabled={locked}
            onChange={(e) => onText(e.target.value)}
            hint={textError ?? a.textoTelaDica}
            warning={textWarning ? t.copy.avisoTextoProibido : undefined}
          />
        ) : (
          <p className="text-[13px] text-text-2">{a.fimDoVideo}</p>
        )}

        {!failed && (
          <Button type="button" variant="secondary" disabled title={a.emBreve}>
            <RotateCcw className="size-4" /> {a.refazerImagem}
          </Button>
        )}
      </div>
    </Card>
  );
}
