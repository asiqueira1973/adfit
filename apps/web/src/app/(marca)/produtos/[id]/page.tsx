import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/feedback";
import { ArchiveProductButton } from "@/features/products/archive-button";
import { PhotoManager } from "@/features/products/photo-manager";
import { SheetPanel, type SheetVersion } from "@/features/products/sheet-panel";
import { JourneySteps } from "@/features/journey/journey-steps";
import { brandContext } from "@/server/brand/context";
import { listActionPrices } from "@/server/brand/credits";
import { getProduct } from "@/server/products/queries";

/**
 * Tela [Marca] Produto (seção 10): dados, fotos originais (adicionar/remover enquanto não há ficha
 * aprovada — critério 8.3 e seção 7.4), arquivar e a ficha (gerar, refazer, aprovar — critérios 8.4).
 */
export default function ProductPage({ params }: PageProps<"/produtos/[id]">) {
  return (
    <Suspense fallback={<div className="h-80 animate-pulse rounded-[14px] bg-surface" />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/produtos/[id]">, "params">) {
  const { id } = await params;
  const { profile, t } = await brandContext();
  const [product, prices] = await Promise.all([getProduct(id), listActionPrices()]);
  if (!product) notFound();
  const price = (acao: string) => prices.find((p) => p.acao === acao)?.creditos ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <JourneySteps current={product.ficha_aprovada_id ? "escolhas" : "ficha"} t={t.jornada} />
      <PageHeader
        title={product.nome}
        subtitle={`${t.categorias[product.categoria]} · ${t.generosAlvo[product.genero_alvo]}`}
        action={<ArchiveProductButton id={product.id} label={t.produtos.arquivar} />}
      />
      {product.descricao && <p className="max-w-prose text-[15px] text-text-2">{product.descricao}</p>}
      <PhotoManager marcaId={profile.marcaId} produtoId={product.id} photos={product.fotos} editable={!product.ficha_aprovada_id} t={t} />
      <SheetPanel
        key={product.fichas.map((f) => `${f.id}:${f.status}`).join(",")}
        produtoId={product.id}
        versions={product.fichas as SheetVersion[]}
        prices={{ gerar: price("gerar_ficha"), refazer: price("refazer_ficha") }}
        hasPhotos={product.fotos.length > 0}
        t={{ produtos: t.produtos, copy: t.copy, erros: t.erros, refazer: t.refazer }}
      />
      {product.ficha_aprovada_id && <ButtonLink href={`/anuncios/novo?produto=${product.id}`}>{t.produtos.novoAnuncioComProduto}</ButtonLink>}
    </div>
  );
}
