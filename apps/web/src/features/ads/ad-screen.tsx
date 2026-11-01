"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Archive, Download } from "lucide-react";
import { Button, CostButton } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";
import { fill } from "@/lib/copy";
import type { Dictionary } from "@/lib/i18n";
import { hasForbiddenTerm } from "@/lib/forbidden-terms";
import { validateScreenText } from "@/lib/text-rules";
import { callApi } from "@/features/admin/api";
import { AdProgress, type StepState } from "./ad-progress";
import { SceneCard, type SceneView } from "./scene-card";

type Status = "gerando_roteiro" | "gerando_quadros" | "aguardando_aprovacao" | "gerando_clipes" | "montando" | "pronto" | "falhou";

/** Intervalo do polling enquanto o anúncio gera (critérios 8.4–8.6: progresso sem recarregar). */
const POLL_MS = 5000;

/**
 * Tela [Marca] Anúncio (seção 10; critérios 8.5–8.7; estados da 12.2). Polling de 5 s enquanto algo
 * gera. Imagens das cenas: escolher/refazer imagem, textos, "Gerar vídeo". Cena que não animou: aviso e
 * "Tentar de novo". Animando/montando: progresso por cena. Pronto: player, "Baixar vídeo", textos com
 * "Atualizar vídeo · grátis" e refazer/usar versão de cada cena. Recebe: anúncio, preços e dicionário.
 */
export function AdScreen({
  ad,
  prices,
  t,
}: {
  ad: { id: string; status: Status; formato: string; comTexto: boolean; videoUrl: string | null; cenas: SceneView[] };
  prices: { gerarVideo: number; refazerQuadro: number; refazerClipe: number };
  t: Pick<Dictionary, "anuncios" | "opcoes" | "copy" | "erros" | "refazer">;
}) {
  const router = useRouter();
  const a = t.anuncios;
  const vertical = ad.formato === "vertical_9_16";
  const anyFrameGenerating = ad.cenas.some((c) => c.quadros.at(-1)?.status === "gerando");
  const anyClipGenerating = ad.cenas.some((c) => c.clipes.at(-1)?.status === "gerando");
  const busy = ad.status.startsWith("gerando_") || ad.status === "montando" || anyFrameGenerating || anyClipGenerating;
  const initialTexts = useMemo(() => Object.fromEntries(ad.cenas.map((c) => [c.id, c.textoTela ?? ""])), [ad.cenas]);
  const [texts, setTexts] = useState<Record<string, string>>(initialTexts);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  // Polling: enquanto gera, consulta o estado e recarrega os dados do servidor quando algo muda.
  const signature = `${ad.status}|${ad.cenas.map((c) => [...c.quadros, ...c.clipes].map((x) => `${x.id}:${x.status}`).join(",")).join(";")}`;
  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(async () => {
      const res = await fetch(`/api/anuncios/${ad.id}`, { cache: "no-store" }).catch(() => null);
      if (!res?.ok) return;
      const json = (await res.json()) as { status: string; cenas: Array<{ quadros: Array<{ id: string; status: string }>; clipes?: Array<{ id: string; status: string }> }> };
      const next = `${json.status}|${json.cenas.map((c) => [...c.quadros, ...(c.clipes ?? [])].map((x) => `${x.id}:${x.status}`).join(",")).join(";")}`;
      if (next !== signature) router.refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [busy, ad.id, signature, router]);

  const archiveButton = (
    <div className="flex flex-col items-center gap-1 pt-2">
      <button type="button" onClick={archive} disabled={busy || saving} className="flex min-h-11 items-center gap-2 rounded-[10px] px-3 text-[14px] font-medium text-text-2 hover:bg-surface disabled:opacity-50">
        <Archive className="size-4" /> {a.arquivar}
      </button>
      {busy && <p className="text-[12px] text-text-2">{a.arquivarEmAndamento}</p>}
    </div>
  );

  if (ad.status === "falhou")
    return (
      <div className="flex flex-col gap-4">
        <Banner tone="danger">{t.copy.falhaGeral}</Banner>
        {message && <Banner tone={message.tone}>{message.text}</Banner>}
        {archiveButton}
      </div>
    );

  const videoPhase = ad.status === "gerando_clipes" || ad.status === "montando" || ad.status === "pronto";
  const failedClipScenes = ad.status === "aguardando_aprovacao" ? ad.cenas.filter((c) => c.clipes.at(-1)?.status === "falhou") : [];
  const errors = Object.fromEntries(ad.cenas.map((c) => [c.id, c.ordem !== 3 && texts[c.id] ? validateScreenText(texts[c.id]) : null]));
  const dirty = ad.comTexto && ad.cenas.some((c) => (texts[c.id] ?? "") !== (initialTexts[c.id] ?? ""));
  const canEditText = (ad.status === "aguardando_aprovacao" || ad.status === "pronto") && !busy;
  const canSave = canEditText && dirty && !Object.values(errors).some(Boolean);
  const readyForVideo = ad.cenas.length === 3 && ad.cenas.every((c) => c.quadros.some((q) => q.id === c.quadroAtualId && q.status === "pronto")) && !anyFrameGenerating;

  async function post(url: string, method: "POST" | "PATCH", body: unknown, ok?: string) {
    setSaving(true);
    setMessage(null);
    const r = await callApi(method, url, body);
    setSaving(false);
    setMessage(r.ok ? (ok ? { tone: "success", text: ok } : null) : { tone: "danger", text: r.mensagem || t.erros.generico });
    if (r.ok) router.refresh();
  }

  // Arquivar (seção 6): some da lista; recusado enquanto algo gera.
  async function archive() {
    if (!window.confirm(a.arquivarConfirma)) return;
    setSaving(true);
    const r = await callApi("PATCH", `/api/anuncios/${ad.id}`, { arquivado: true });
    setSaving(false);
    if (!r.ok) return setMessage({ tone: "danger", text: r.mensagem || t.erros.generico });
    router.push("/anuncios");
  }

  const saveTexts = () =>
    post(`/api/anuncios/${ad.id}/textos`, "PATCH", { cenas: ad.cenas.filter((c) => c.ordem !== 3).map((c) => ({ id: c.id, texto_tela: texts[c.id]?.trim() ? texts[c.id] : null })) }, ad.status === "pronto" ? a.atualizandoVideo : a.salvo);

  const sceneState = (c: SceneView): StepState => {
    const list = videoPhase ? c.clipes : c.quadros;
    const last = list.at(-1);
    if (!last || last.status === "gerando") return ad.status === "gerando_roteiro" ? "espera" : "andamento";
    return last.status === "falhou" && !list.some((x) => x.status === "pronto") ? "falhou" : "feito";
  };

  const progress = (() => {
    if (ad.status === "gerando_roteiro" || ad.status === "gerando_quadros") {
      return (
        <AdProgress
          title={t.copy.anuncioGerandoQuadros}
          steps={[
            { label: a.roteiro, state: ad.status === "gerando_roteiro" ? "andamento" : "feito" },
            ...([1, 2, 3] as const).map((n) => {
              const cena = ad.cenas.find((c) => c.ordem === n);
              return { label: `${fill(a.cena, { n })} · ${t.opcoes.papelCena[n]}`, state: cena ? sceneState(cena) : ("espera" as StepState), hint: a.falhouCenaImagem };
            }),
          ]}
        />
      );
    }
    if (ad.status === "gerando_clipes" || ad.status === "montando") {
      return (
        <AdProgress
          title={ad.status === "montando" ? a.montandoVideo : t.copy.gerandoVideo}
          steps={[
            ...ad.cenas.map((c) => ({ label: `${fill(a.cena, { n: c.ordem })} · ${t.opcoes.papelCena[c.ordem]}`, state: sceneState(c), hint: a.falhouCenaVideo })),
            { label: a.etapaMontagem, state: (ad.status === "montando" ? "andamento" : "espera") as StepState },
          ]}
        />
      );
    }
    return null;
  })();

  return (
    <div className="flex flex-col gap-6">
      {progress}

      {ad.status === "pronto" && ad.videoUrl && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-[17px] font-semibold">{t.copy.videoPronto}</p>
          <video src={ad.videoUrl} controls playsInline className={vertical ? "w-full max-w-[360px] rounded-[14px] bg-black" : "w-full rounded-[14px] bg-black"} />
          <a href={`/api/anuncios/${ad.id}/download`} className="flex min-h-12 w-full max-w-[360px] items-center justify-center gap-2 rounded-[12px] bg-brand px-4 text-[16px] font-semibold text-brand-ink">
            <Download className="size-4.5" /> {a.baixarVideo}
          </a>
          <p className="text-center text-[13px] text-text-2">{a.ajustesDica}</p>
        </div>
      )}

      {ad.status === "aguardando_aprovacao" && failedClipScenes.length === 0 && !anyFrameGenerating && <p className="text-[17px]">{t.copy.anuncioAguardando}</p>}
      {failedClipScenes.map((c) => (
        <Banner key={c.id} tone="danger">
          {fill(t.copy.falhaCena, { n: c.ordem })}
        </Banner>
      ))}
      {message && <Banner tone={message.tone}>{message.text}</Banner>}

      {ad.cenas.length > 0 && (
        <div className={vertical ? "grid grid-cols-1 gap-4 md:grid-cols-3" : "grid grid-cols-1 gap-4 lg:grid-cols-3"}>
          {ad.cenas.map((c) => (
            <SceneCard
              key={c.id}
              cena={c}
              mode={videoPhase || failedClipScenes.length > 0 ? "video" : "imagens"}
              vertical={vertical}
              text={texts[c.id] ?? ""}
              onText={(v) => setTexts((prev) => ({ ...prev, [c.id]: v }))}
              textError={errors[c.id] ?? null}
              textWarning={hasForbiddenTerm(texts[c.id])}
              locked={busy || saving || !canEditText}
              comTexto={ad.comTexto}
              prices={{ refazerQuadro: prices.refazerQuadro, refazerClipe: prices.refazerClipe }}
              t={t}
            />
          ))}
        </div>
      )}

      {(ad.status === "aguardando_aprovacao" || ad.status === "pronto") && (dirty || (ad.status === "aguardando_aprovacao" && failedClipScenes.length === 0)) && (
        <div className="sticky bottom-20 z-20 -mx-4 border-t border-hairline bg-bg/90 px-4 py-3 backdrop-blur-xl md:bottom-0">
          <div className="mx-auto flex max-w-md flex-col gap-2">
            {dirty && (
              <Button type="button" variant={ad.status === "pronto" ? "primary" : "secondary"} onClick={saveTexts} disabled={!canSave || saving}>
                {saving ? a.salvando : ad.status === "pronto" ? a.atualizarVideo : a.salvarTextos}
              </Button>
            )}
            {ad.status === "aguardando_aprovacao" && failedClipScenes.length === 0 && (
              saving ? (
                <Button type="button" disabled>
                  {a.iniciandoVideo}
                </Button>
              ) : (
                <CostButton label={a.gerarVideo} cost={prices.gerarVideo} balance={0} disabled={!readyForVideo || dirty} onClick={() => post(`/api/anuncios/${ad.id}/gerar-video`, "POST", {})} />
              )
            )}
          </div>
        </div>
      )}

      {archiveButton}
    </div>
  );
}
