"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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

/** Intervalo do polling enquanto o anúncio gera (critério 8.5: progresso sem recarregar). */
const POLL_MS = 5000;

/**
 * Tela [Marca] Anúncio até a aprovação de quadros (seção 10; critérios 8.5; estados da 12.2):
 * progresso (roteiro e cenas) com polling de 5 s; 3 cartões de cena; textos editáveis com
 * "Salvar textos" (`PATCH /api/anuncios/:id/textos`); "Gerar vídeo" aparece desabilitado até o 8.6;
 * falha geral com a mensagem da seção 15. Recebe: anúncio, preço do vídeo e dicionário.
 */
export function AdScreen({
  ad,
  videoPrice,
  t,
}: {
  ad: { id: string; status: Status; formato: string; comTexto: boolean; cenas: SceneView[] };
  videoPrice: number;
  t: Pick<Dictionary, "anuncios" | "opcoes" | "copy" | "erros">;
}) {
  const router = useRouter();
  const a = t.anuncios;
  const vertical = ad.formato === "vertical_9_16";
  const busy = ad.status.startsWith("gerando_") || ad.status === "montando";
  const initialTexts = useMemo(() => Object.fromEntries(ad.cenas.map((c) => [c.id, c.textoTela ?? ""])), [ad.cenas]);
  const [texts, setTexts] = useState<Record<string, string>>(initialTexts);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  // Polling: enquanto gera, consulta o estado e recarrega os dados do servidor quando algo muda.
  const signature = `${ad.status}|${ad.cenas.map((c) => c.quadros.map((q) => `${q.id}:${q.status}`).join(",")).join(";")}`;
  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(async () => {
      const res = await fetch(`/api/anuncios/${ad.id}`, { cache: "no-store" }).catch(() => null);
      if (!res?.ok) return;
      const json = (await res.json()) as { status: string; cenas: Array<{ quadros: Array<{ id: string; status: string }> }> };
      const next = `${json.status}|${json.cenas.map((c) => c.quadros.map((q) => `${q.id}:${q.status}`).join(",")).join(";")}`;
      if (next !== signature) router.refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [busy, ad.id, signature, router]);

  if (ad.status === "falhou") return <Banner tone="danger">{t.copy.falhaGeral}</Banner>;

  const sceneState = (c: SceneView): StepState => {
    const last = c.quadros.at(-1);
    if (!last || last.status === "gerando") return ad.status === "gerando_roteiro" ? "espera" : "andamento";
    return last.status === "falhou" && !c.quadros.some((q) => q.status === "pronto") ? "falhou" : "feito";
  };
  const errors = Object.fromEntries(ad.cenas.map((c) => [c.id, c.ordem !== 3 && texts[c.id] ? validateScreenText(texts[c.id]) : null]));
  const dirty = ad.comTexto && ad.cenas.some((c) => (texts[c.id] ?? "") !== (initialTexts[c.id] ?? ""));
  const canSave = ad.status === "aguardando_aprovacao" && dirty && !Object.values(errors).some(Boolean);

  async function saveTexts() {
    setSaving(true);
    setMessage(null);
    const result = await callApi("PATCH", `/api/anuncios/${ad.id}/textos`, {
      cenas: ad.cenas.filter((c) => c.ordem !== 3).map((c) => ({ id: c.id, texto_tela: texts[c.id]?.trim() ? texts[c.id] : null })),
    });
    setSaving(false);
    setMessage(result.ok ? { tone: "success", text: a.salvo } : { tone: "danger", text: result.mensagem || t.erros.generico });
    if (result.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {busy ? (
        <AdProgress
          title={t.copy.anuncioGerandoQuadros}
          steps={[
            { label: a.roteiro, state: ad.status === "gerando_roteiro" ? "andamento" : "feito" },
            ...([1, 2, 3] as const).map((n) => {
              const cena = ad.cenas.find((c) => c.ordem === n);
              return { label: `${fill(a.cena, { n })} · ${t.opcoes.papelCena[n]}`, state: cena ? sceneState(cena) : ("espera" as StepState) };
            }),
          ]}
        />
      ) : (
        <p className="text-[17px]">{t.copy.anuncioAguardando}</p>
      )}

      {message && <Banner tone={message.tone === "success" ? "success" : "danger"}>{message.text}</Banner>}

      {ad.cenas.length > 0 && (
        <div className={vertical ? "grid grid-cols-1 gap-4 md:grid-cols-3" : "grid grid-cols-1 gap-4 lg:grid-cols-3"}>
          {ad.cenas.map((c) => (
            <SceneCard
              key={c.id}
              cena={c}
              vertical={vertical}
              text={texts[c.id] ?? ""}
              onText={(v) => setTexts((prev) => ({ ...prev, [c.id]: v }))}
              textError={errors[c.id] ?? null}
              textWarning={hasForbiddenTerm(texts[c.id])}
              locked={busy || saving}
              comTexto={ad.comTexto}
              t={t}
            />
          ))}
        </div>
      )}

      {ad.status === "aguardando_aprovacao" && (
        <div className="sticky bottom-20 z-20 -mx-4 border-t border-hairline bg-bg/90 px-4 py-3 backdrop-blur-xl md:bottom-0">
          <div className="mx-auto flex max-w-md flex-col gap-2">
            {dirty && (
              <Button type="button" variant="secondary" onClick={saveTexts} disabled={!canSave || saving}>
                {saving ? a.salvando : a.salvarTextos}
              </Button>
            )}
            <CostButton label={a.gerarVideo} cost={videoPrice} balance={0} disabled title={a.emBreve} />
          </div>
        </div>
      )}
    </div>
  );
}
