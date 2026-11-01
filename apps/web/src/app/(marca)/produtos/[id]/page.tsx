import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CostButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/feedback";
import { ArchiveProductButton } from "@/features/products/archive-button";
import { PhotoManager } from "@/features/products/photo-manager";
import { brandContext } from "@/server/brand/context";
import { listActionPrices } from "@/server/brand/credits";
import { getProduct } from "@/server/products/queries";

/**
 * Tela [Marca] Produto (seção 10): dados, fotos originais (adicionar/remover enquanto não há ficha
 * aprovada — critério 8.3 e seção 7.4), arquivar e a área da ficha. Gerar/aprovar ficha entra no 8.4.
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
  const preco = prices.find((p) => p.acao === "gerar_ficha")?.creditos ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={product.nome}
        subtitle={`${t.categorias[product.categoria]} · ${t.generosAlvo[product.genero_alvo]}`}
        action={<ArchiveProductButton id={product.id} label={t.produtos.arquivar} />}
      />
      {product.descricao && <p className="max-w-prose text-[15px] text-text-2">{product.descricao}</p>}
      <PhotoManager marcaId={profile.marcaId} produtoId={product.id} photos={product.fotos} editable={!product.ficha_aprovada_id} t={t} />
      <Card className="flex flex-col gap-4 p-4">
        <h2 className="text-[17px] font-semibold">{t.produtos.fichaTitulo}</h2>
        <p className="text-[15px] text-text-2">{t.produtos.fichaExplica}</p>
        <CostButton label={t.produtos.gerarFicha} cost={preco} balance={0} disabled={product.fotos.length === 0} />
      </Card>
    </div>
  );
}
