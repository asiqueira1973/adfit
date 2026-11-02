import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/feedback";
import { AdScreen } from "@/features/ads/ad-screen";
import { JourneySteps } from "@/features/journey/journey-steps";
import { brandContext } from "@/server/brand/context";
import { listActionPrices } from "@/server/brand/credits";
import { getAdView } from "@/server/ads/service";
import { businessCodeOf } from "@/server/api/http";

/**
 * Tela [Marca] Anúncio (seção 10): uma tela que muda conforme `anuncios.status` (seção 12.2).
 * Até o 8.5: progresso do roteiro e das cenas, aprovação de quadros com texto editável e falha
 * geral. Vídeo, refação e download entram nos épicos 8.6 e 8.7.
 */
export default function AdPage({ params }: PageProps<"/anuncios/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[14px] bg-surface" />}>
      <AdContent params={params} />
    </Suspense>
  );
}

async function AdContent({ params }: Pick<PageProps<"/anuncios/[id]">, "params">) {
  const { id } = await params;
  const { profile, t } = await brandContext();
  const [view, prices] = await Promise.all([
    getAdView(profile, id).catch((e) => {
      if (businessCodeOf(e) === "anuncio_inexistente") return null;
      throw e;
    }),
    listActionPrices(),
  ]);
  if (!view) notFound();
  const price = (acao: string) => prices.find((p) => p.acao === acao)?.creditos ?? 0;
  return (
    <div className="flex flex-col gap-6">
      <JourneySteps
        current={
          view.status === "pronto"
            ? "concluido"
            : view.status === "montando"
              ? "video"
              : view.status === "gerando_clipes" || view.cenas.some((c) => c.clipes.length > 0)
                ? "clipes"
                : "imagens"
        }
        t={t.jornada}
      />
      <PageHeader title={view.titulo} />
      <AdScreen
        key={`${view.status}:${view.versaoMontagem}:${view.cenas.map((c) => `${c.textoTela ?? ""}|${c.quadroAtualId}|${c.clipeAtualId}|${c.quadros.map((q) => q.status).join("")}${c.clipes.map((k) => k.status).join("")}`).join(";")}`}
        ad={{ id: view.id, status: view.status, formato: view.formato, comTexto: view.comTexto, videoUrl: view.videoUrl, cenas: view.cenas, personagemId: view.personagemId }}
        prices={{ gerarVideo: price("gerar_video"), refazerQuadro: price("refazer_quadro"), refazerClipe: price("refazer_clipe"), salvarPersonagem: price("gerar_ficha_personagem") }}
        t={{ anuncios: t.anuncios, opcoes: t.opcoes, copy: t.copy, erros: t.erros, refazer: t.refazer, personagens: t.personagens }}
      />
    </div>
  );
}
