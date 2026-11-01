import { Suspense } from "react";
import { Archive, PencilLine } from "lucide-react";
import { CostButton } from "@/components/ui/button";
import { Banner, PageHeader } from "@/components/ui/feedback";
import { AdProgress, sceneLabel } from "@/features/ads/ad-progress";
import { ReadyView } from "@/features/ads/ready-view";
import { SceneCard } from "@/features/ads/scene-card";
import { fxAds, fxPrices, fxScenes } from "@/features/fixtures";
import { readFlags } from "@/features/fixtures/flags";
import { COPY, fill } from "@/lib/copy";

/**
 * Tela [Marca] Anúncio (seção 10): uma tela que muda conforme `anuncios.status` (seção 12.2).
 * Estados de design: `?estado=gerando|aguardando|gerando_video|falha_cena|pronto|falhou`,
 * `?formato=horizontal`. Durante qualquer geração as ações que mudam o anúncio ficam bloqueadas.
 */
export default function AdPage({ params, searchParams }: PageProps<"/anuncios/[id]">) {
  return (
    <Suspense>
      <AdContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function AdContent({ params, searchParams }: Pick<PageProps<"/anuncios/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  const flags = readFlags(await searchParams);
  const ad = fxAds.find((a) => a.id === id) ?? fxAds[0];
  const vertical = flags.formato !== "horizontal";
  const estado = flags.estado ?? "aguardando";
  const title = vertical ? ad.titulo : ad.titulo.replace("9:16", "16:9");

  const header = (
    <PageHeader
      title={title}
      action={
        <details className="relative">
          <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full hover:bg-surface [&::-webkit-details-marker]:hidden" aria-label="Mais ações">
            <span className="text-[20px] leading-none">···</span>
          </summary>
          <div className="absolute right-0 z-40 mt-1 w-48 overflow-hidden rounded-[14px] border border-hairline bg-bg shadow-lg">
            <button type="button" className="flex min-h-11 w-full items-center gap-3 px-4 text-[15px] hover:bg-surface"><PencilLine className="size-4.5 text-text-2" /> Renomear</button>
            <button type="button" className="flex min-h-11 w-full items-center gap-3 px-4 text-[15px] hover:bg-surface"><Archive className="size-4.5 text-text-2" /> Arquivar</button>
          </div>
        </details>
      }
    />
  );

  if (estado === "gerando") {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <AdProgress
          title={COPY.anuncioGerandoQuadros}
          steps={[
            { label: "Roteiro", state: "feito" },
            { label: sceneLabel(1), state: "feito" },
            { label: sceneLabel(2), state: "andamento" },
            { label: sceneLabel(3), state: "andamento" },
          ]}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {fxScenes.map((s) => (
            <SceneCard key={s.ordem} {...s} versoes={1} qcAviso={false} vertical={vertical} balance={flags.saldo} paused={flags.pausada} locked generating={s.ordem !== 1} />
          ))}
        </div>
      </div>
    );
  }

  if (estado === "gerando_video") {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <AdProgress
          title={COPY.gerandoVideo}
          steps={[
            { label: sceneLabel(1), state: "feito" },
            { label: sceneLabel(2), state: "andamento" },
            { label: sceneLabel(3), state: "andamento" },
            { label: "Montando o vídeo", state: "espera" },
          ]}
        />
      </div>
    );
  }

  if (estado === "falhou") {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Banner tone="danger">{COPY.falhaGeral}</Banner>
      </div>
    );
  }

  if (estado === "pronto") {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ReadyView vertical={vertical} balance={flags.saldo} paused={flags.pausada} />
      </div>
    );
  }

  const failedScene = estado === "falha_cena" ? 2 : null;
  return (
    <div className="flex flex-col gap-6">
      {header}
      {failedScene ? (
        <Banner tone="danger" action={<CostButton label="Tentar de novo" cost={fxPrices.refazer_clipe} balance={flags.saldo} paused={flags.pausada} variant="secondary" />}>
          {fill(COPY.falhaCena, { n: failedScene })}
        </Banner>
      ) : (
        <p className="text-[17px]">{COPY.anuncioAguardando}</p>
      )}
      <div className={vertical ? "grid grid-cols-1 gap-4 md:grid-cols-3" : "grid grid-cols-1 gap-4 lg:grid-cols-3"}>
        {fxScenes.map((s) => (
          <SceneCard key={s.ordem} {...s} vertical={vertical} balance={flags.saldo} paused={flags.pausada} />
        ))}
      </div>
      <div className="sticky bottom-20 z-20 -mx-4 border-t border-hairline bg-bg/90 px-4 py-3 backdrop-blur-xl md:bottom-0">
        <div className="mx-auto max-w-md">
          {failedScene ? (
            <p className="text-center text-[13px] text-text-2">As outras cenas já estão animadas.</p>
          ) : (
            <CostButton label="Gerar vídeo" cost={fxPrices.gerar_video} balance={flags.saldo} paused={flags.pausada} />
          )}
        </div>
      </div>
    </div>
  );
}
