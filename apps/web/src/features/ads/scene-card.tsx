"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, Check, RotateCcw } from "lucide-react";
import { Button, CostButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Banner, Spinner } from "@/components/ui/feedback";
import { TextArea } from "@/components/ui/field";
import { cn } from "@/components/ui/cn";
import { fill } from "@/lib/copy";
import type { Dictionary } from "@/lib/i18n";
import { callApi } from "@/features/admin/api";

type ItemStatus = "gerando" | "pronto" | "descartado" | "falhou";
export type SceneFrame = { id: string; versao: number; status: ItemStatus; url: string | null; avisoQc: boolean };
export type SceneClip = { id: string; versao: number; status: ItemStatus; url: string | null };
export type SceneView = {
  id: string;
  ordem: 1 | 2 | 3;
  descricao: string;
  textoTela: string | null;
  quadroAtualId: string | null;
  clipeAtualId: string | null;
  quadros: SceneFrame[];
  clipes: SceneClip[];
};

/**
 * Cartão de cena (seção 10; critérios 8.5–8.7). Modo "imagens": quadro na proporção do formato, aviso
 * de QC (11.5), versões com "Usar esta", "Refazer imagem" com instrução (grátis se a cena só falhou —
 * D-18) e texto da tela editável. Modo "video": clipe atual em loop, versões com "Usar esta"
 * (remontagem grátis) e "Refazer cena" com instrução. Recebe: cena, modo, formato, texto e seus
 * avisos, se está bloqueado, se o anúncio tem texto, preços e dicionário.
 */
export function SceneCard({
  cena,
  mode,
  vertical,
  text,
  onText,
  textError,
  textWarning,
  locked,
  comTexto,
  prices,
  t,
}: {
  cena: SceneView;
  mode: "imagens" | "video";
  vertical: boolean;
  text: string;
  onText: (value: string) => void;
  textError: string | null;
  textWarning: boolean;
  locked: boolean;
  comTexto: boolean;
  prices: { refazerQuadro: number; refazerClipe: number };
  t: Pick<Dictionary, "anuncios" | "opcoes" | "copy" | "erros">;
}) {
  const a = t.anuncios;
  const router = useRouter();
  const [redo, setRedo] = useState(false);
  const [instrucao, setInstrucao] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestFrame = cena.quadros.at(-1);
  const readyFrames = cena.quadros.filter((q) => q.status === "pronto");
  const currentFrame = cena.quadros.find((q) => q.id === cena.quadroAtualId) ?? readyFrames.at(-1) ?? null;
  const frameGenerating = !latestFrame || latestFrame.status === "gerando";
  const onlyFailed = !frameGenerating && readyFrames.length === 0;

  const latestClip = cena.clipes.at(-1);
  const readyClips = cena.clipes.filter((c) => c.status === "pronto");
  const currentClip = cena.clipes.find((c) => c.id === cena.clipeAtualId) ?? readyClips.at(-1) ?? null;
  const clipGenerating = latestClip?.status === "gerando";

  async function call(url: string, body: unknown) {
    setBusy(true);
    setError(null);
    const r = await callApi("POST", url, body);
    setBusy(false);
    if (!r.ok) return setError(r.mensagem || t.erros.generico);
    setRedo(false);
    setInstrucao("");
    router.refresh();
  }

  const media =
    mode === "video" ? (
      clipGenerating || !currentClip?.url ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-2">
          <Spinner className="size-6" />
          <span className="text-[13px]">{a.animandoCena}</span>
        </div>
      ) : (
        <video key={currentClip.id} src={currentClip.url} className="absolute inset-0 size-full object-cover" muted loop autoPlay playsInline />
      )
    ) : frameGenerating ? (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-2">
        <Spinner className="size-6" />
        <span className="text-[13px]">{a.criandoCena}</span>
      </div>
    ) : currentFrame?.url ? (
      <Image src={currentFrame.url} alt={fill(a.imagemCena, { n: cena.ordem })} fill unoptimized sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
    ) : (
      <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[14px] text-text-2">{a.cenaFalhou}</div>
    );

  const versions = mode === "video" ? readyClips : readyFrames;
  const currentId = mode === "video" ? currentClip?.id : currentFrame?.id;

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className={cn("relative w-full bg-text/10", vertical ? "aspect-[9/16]" : "aspect-video")}>
        {media}
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[12px] font-semibold text-white backdrop-blur">
          {fill(a.cena, { n: cena.ordem })} · {t.opcoes.papelCena[cena.ordem]}
        </span>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {error && <Banner tone="danger">{error}</Banner>}
        {mode === "imagens" && currentFrame?.avisoQc && !frameGenerating && (
          <div className="flex items-start gap-2 rounded-[10px] bg-warning/14 px-3 py-2 text-[14px]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" /> {t.copy.avisoQc}
          </div>
        )}
        <p className="text-[15px] text-text-2">{cena.descricao}</p>

        {versions.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {versions.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={locked || busy || v.id === currentId}
                onClick={() => call(mode === "video" ? `/api/cenas/${cena.id}/usar-clipe` : `/api/cenas/${cena.id}/usar-quadro`, mode === "video" ? { clipe_id: v.id } : { quadro_id: v.id })}
                title={v.id === currentId ? undefined : a.usarEsta}
                className={cn("flex min-h-11 items-center gap-1 rounded-full px-3.5 text-[13px] font-semibold disabled:cursor-default", v.id === currentId ? "bg-text text-bg" : "bg-bg hover:bg-surface")}
              >
                {v.id === currentId && <Check className="size-3.5" />} {fill(a.versao, { n: v.versao })}
              </button>
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

        {redo ? (
          <div className="flex flex-col gap-3">
            <TextArea label={t.copy.refazerQuadroCampo} rows={2} maxChars={200} value={instrucao} onChange={(e) => setInstrucao(e.target.value)} placeholder={mode === "video" ? a.refazerCenaExemplo : a.refazerImagemExemplo} />
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="ghost" onClick={() => setRedo(false)} disabled={busy}>
                {a.cancelar}
              </Button>
              <CostButton
                label={mode === "video" ? a.refazerCena : a.refazerImagem}
                cost={mode === "video" ? prices.refazerClipe : onlyFailed ? 0 : prices.refazerQuadro}
                balance={0}
                disabled={busy}
                onClick={() => call(mode === "video" ? `/api/cenas/${cena.id}/refazer-clipe` : `/api/cenas/${cena.id}/refazer-quadro`, instrucao.trim() ? { instrucao } : {})}
              />
            </div>
          </div>
        ) : (
          !locked &&
          !(mode === "imagens" ? frameGenerating : clipGenerating) && (
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setRedo(true)}>
              <RotateCcw className="size-4" /> {mode === "video" ? a.refazerCena : onlyFailed ? a.tentarDeNovoGratis : a.refazerImagem}
            </Button>
          )
        )}
      </div>
    </Card>
  );
}
