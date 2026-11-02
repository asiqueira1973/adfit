"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, CostButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Banner, Spinner } from "@/components/ui/feedback";
import { TextArea } from "@/components/ui/field";
import { cn } from "@/components/ui/cn";
import { fill } from "@/lib/copy";
import type { Dictionary } from "@/lib/i18n";
import { callApi } from "@/features/admin/api";
import { RedoShortcuts } from "@/features/ads/redo-shortcuts";

export type SheetVersion = { id: string; versao: number; status: "gerando" | "aguardando_aprovacao" | "aprovada" | "descartada" | "falhou"; url: string | null };

/** Intervalo do polling enquanto há ficha `gerando` (critério 8.4: "polling de 5 s"). */
const POLL_MS = 5000;

/**
 * Área da ficha de produto (seção 10; critérios 8.4): gerar, acompanhar sem recarregar a página,
 * aprovar, refazer com o campo "O que está diferente da peça real?" e voltar para uma versão
 * anterior (aprovar uma `descartada`, sem custo). Saldo e pausa vêm do BrandStatusProvider.
 * Recebe: produto, versões (com URL assinada), preços, se há fotos e o dicionário. Devolve: o cartão.
 */
export type SheetTexts = Record<"aprovarFicha" | "aprovarVersao" | "cancelar" | "fichaAlt" | "fichaAprovada" | "fichaConfira" | "fichaExplica" | "fichaFotosCongeladas" | "fichaPreparando" | "fichaTitulo" | "gerarFicha" | "refazerExemplo" | "refazerFicha" | "versao" | "fichaGerando" | "fichaPronta", string>;

export function SheetPanel({
  produtoId,
  versions,
  prices,
  hasPhotos,
  t,
  api,
  texts,
}: {
  produtoId: string;
  versions: SheetVersion[];
  prices: { gerar: number; refazer: number };
  hasPhotos: boolean;
  t: Pick<Dictionary, "produtos" | "copy" | "erros" | "refazer">;
  /**
   * Endereços (padrão: ficha do produto). A ficha de personagem (MD-17) usa os seus. Só textos:
   * a página é do servidor e não pode passar função para este componente do navegador (bug B-16).
   * `approveBase` + `<id>/aprovar` = rota de aprovação.
   */
  api?: { sheet: string; approveBase: string };
  /** Textos que mudam entre ficha da peça e ficha de personagem (MD-17). */
  texts?: Partial<SheetTexts>;
}) {
  const router = useRouter();
  const L: SheetTexts = {
    ...(Object.fromEntries((["aprovarFicha", "aprovarVersao", "cancelar", "fichaAlt", "fichaAprovada", "fichaConfira", "fichaExplica", "fichaFotosCongeladas", "fichaPreparando", "fichaTitulo", "gerarFicha", "refazerExemplo", "refazerFicha", "versao"] as const).map((k) => [k, t.produtos[k]])) as SheetTexts),
    fichaGerando: t.copy.fichaGerando,
    fichaPronta: t.copy.fichaPronta,
    ...texts,
  };
  const sheetUrl = api?.sheet ?? `/api/produtos/${produtoId}/ficha`;
  const approveUrl = (id: string) => `${api?.approveBase ?? "/api/fichas/"}${id}/aprovar`;
  const withImage = versions.filter((v) => v.url);
  const generating = versions.some((v) => v.status === "gerando");
  const latest = versions.at(-1);
  const approved = withImage.find((v) => v.status === "aprovada");
  // Versão nova para conferir vem primeiro (fluxo 8.4: "ficha aparece → Aprovar ou Refazer").
  const toReview = withImage.filter((v) => v.status === "aguardando_aprovacao").at(-1);
  const lastFailed = !generating && latest?.status === "falhou";
  const defaultSelected = (toReview ?? approved ?? withImage.at(-1))?.id ?? null;

  const [selectedId, setSelectedId] = useState<string | null>(defaultSelected);
  const [redo, setRedo] = useState(false);
  const [instrucao, setInstrucao] = useState("");
  const [atalhos, setAtalhos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A versão escolhida some quando a lista muda (nova versão pronta): volta ao padrão.
  const selected = withImage.find((v) => v.id === selectedId) ?? withImage.find((v) => v.id === defaultSelected) ?? null;

  // Ao começar ou terminar uma ficha, leva o painel para a tela: o aviso "Preparando…" e o resultado
  // aparecem no topo do painel, longe do botão "Refazer" (relato do Alexandre, 01/11/2026).
  const cardRef = useRef<HTMLDivElement>(null);
  const wasGenerating = useRef(generating);
  useEffect(() => {
    if (wasGenerating.current !== generating) cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    wasGenerating.current = generating;
  }, [generating]);

  useEffect(() => {
    if (!generating) return;
    const timer = setInterval(async () => {
      const res = await fetch(sheetUrl, { cache: "no-store" }).catch(() => null);
      const json = res?.ok ? ((await res.json()) as { versoes: Array<{ status: string }> }) : null;
      if (json && !json.versoes.some((v) => v.status === "gerando")) router.refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [generating, sheetUrl, router]);

  async function run(fn: () => ReturnType<typeof callApi>) {
    setBusy(true);
    setError(null);
    const result = await fn();
    setBusy(false);
    if (!result.ok) return setError(result.mensagem || t.erros.generico);
    setRedo(false);
    setInstrucao("");
    setAtalhos([]);
    setSelectedId(null);
    router.refresh();
  }

  const generate = (text?: string, codes: string[] = []) =>
    run(() => callApi("POST", sheetUrl, { ...(text?.trim() ? { instrucao: text } : {}), ...(codes.length ? { atalhos: codes } : {}) }));
  const approve = (id: string) => run(() => callApi("POST", approveUrl(id), {}));

  return (
    <Card ref={cardRef} className="flex scroll-mt-20 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-semibold">{L.fichaTitulo}</h2>
        {generating && <Badge tone="processing">{L.fichaPreparando}</Badge>}
        {!generating && selected?.status === "aprovada" && <Badge tone="success">{L.fichaAprovada}</Badge>}
        {!generating && selected?.status === "aguardando_aprovacao" && <Badge tone="warning">{L.fichaConfira}</Badge>}
      </div>

      {error && <Banner tone="danger">{error}</Banner>}

      {!generating && !selected && <p className="text-[15px] text-text-2">{L.fichaExplica}</p>}

      {!versions.length && (
        <>
          <CostButton label={L.gerarFicha} cost={prices.gerar} balance={0} disabled={!hasPhotos || busy} onClick={() => generate()} />
        </>
      )}

      {generating && (
        <div className="flex flex-col items-center gap-3 rounded-[10px] bg-bg px-4 py-10 text-center">
          <Spinner className="size-7" />
          <p className="max-w-xs text-[15px]">{L.fichaGerando}</p>
        </div>
      )}

      {lastFailed && !approved && (
        <>
          <Banner tone="danger">{t.copy.falhaGeral}</Banner>
          {!withImage.length && (
            <CostButton label={L.gerarFicha} cost={prices.gerar} balance={0} disabled={!hasPhotos || busy} onClick={() => generate()} />
          )}
        </>
      )}

      {selected && (
        <>
          <div className="relative aspect-[16/9] overflow-hidden rounded-[10px] bg-[#EDEDED]">
            <Image src={selected.url!} alt={L.fichaAlt} fill unoptimized sizes="(max-width: 768px) 100vw, 640px" className="object-contain" />
          </div>
          {selected.status === "aguardando_aprovacao" && <p className="text-[15px]">{L.fichaPronta}</p>}
          {withImage.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {withImage.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  aria-pressed={v.id === selected.id}
                  className={cn("flex min-h-11 items-center rounded-full px-3.5 text-[13px] font-semibold", v.id === selected.id ? "bg-text text-bg" : "bg-bg text-text")}
                >
                  {fill(L.versao, { n: v.versao })}
                </button>
              ))}
            </div>
          )}

          {!generating &&
            (redo ? (
              <div className="flex flex-col gap-3">
                <RedoShortcuts kind="ficha" value={atalhos} onChange={setAtalhos} t={t.refazer} />
                <TextArea
                  label={t.refazer.textoOpcional}
                  name="instrucao"
                  rows={3}
                  maxChars={200}
                  value={instrucao}
                  onChange={(e) => setInstrucao(e.target.value)}
                  placeholder={L.refazerExemplo}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="ghost" onClick={() => setRedo(false)} disabled={busy}>
                    {L.cancelar}
                  </Button>
                  <CostButton label={L.refazerFicha} cost={prices.refazer} balance={0} disabled={busy} onClick={() => generate(instrucao, atalhos)} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {selected.status !== "aprovada" && (
                  <Button type="button" onClick={() => approve(selected.id)} disabled={busy}>
                    <Check className="size-4.5" /> {selected.status === "descartada" ? L.aprovarVersao : L.aprovarFicha}
                  </Button>
                )}
                <CostButton
                  label={L.refazerFicha}
                  cost={prices.refazer}
                  balance={0}
                  variant="secondary"
                  icon={<RotateCcw className="size-4" />}
                  onClick={() => setRedo(true)}
                  disabled={busy}
                />
              </div>
            ))}
          {selected.status === "aprovada" && <p className="text-[13px] text-text-2">{L.fichaFotosCongeladas}</p>}
        </>
      )}
    </Card>
  );
}
