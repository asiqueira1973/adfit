import Image from "next/image";
import { Suspense } from "react";
import { Archive, Plus } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/feedback";
import { AdCard } from "@/features/ads/ad-card";
import { SheetPanel, type SheetState } from "@/features/products/sheet-panel";
import { fxAds, fxProducts } from "@/features/fixtures";
import { readFlags } from "@/features/fixtures/flags";
import { CATEGORIA_LABEL, GENERO_ALVO_LABEL, type Categoria } from "@/lib/labels";

/**
 * Tela [Marca] Produto (seção 10): fotos originais, ficha e versões, anúncios do produto,
 * "Novo anúncio com este produto". Estados de design: `?estado=sem_ficha|gerando|aguardando|aprovada|falhou`.
 */
export default function ProductPage({ params, searchParams }: PageProps<"/produtos/[id]">) {
  return (
    <Suspense>
      <ProductContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ProductContent({ params, searchParams }: Pick<PageProps<"/produtos/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  const flags = readFlags(await searchParams);
  const product = fxProducts.find((p) => p.id === id) ?? fxProducts[0];
  const state = (flags.estado as SheetState) ?? (product.status === "pronto" ? "aprovada" : product.status === "gerando" ? "gerando" : "sem_ficha");
  const ads = state === "aprovada" ? fxAds.filter((a) => a.produto_id === product.id) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={product.nome}
        subtitle={`${CATEGORIA_LABEL[product.categoria as Categoria]} · ${GENERO_ALVO_LABEL[product.genero_alvo as keyof typeof GENERO_ALVO_LABEL]}`}
        action={<Button variant="ghost" className="px-3" aria-label="Arquivar produto"><Archive className="size-4.5" /></Button>}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-text-2">Fotos originais</h2>
        <div className="grid grid-cols-4 gap-2 md:max-w-md">
          {product.fotos.map((src) => (
            <div key={src} className="relative aspect-square overflow-hidden rounded-[10px] bg-surface">
              <Image src={src} alt="Foto original da peça" fill sizes="96px" className="object-cover" />
            </div>
          ))}
        </div>
      </section>

      <SheetPanel state={state} balance={flags.saldo} paused={flags.pausada} />

      {state === "aprovada" && (
        <ButtonLink href={`/anuncios/novo?produto=${product.id}`}><Plus className="size-5" /> Novo anúncio com este produto</ButtonLink>
      )}

      {ads.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[22px] font-bold tracking-tight">Anúncios deste produto</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-4">
            {ads.map((a) => <AdCard key={a.id} {...a} />)}
          </div>
        </section>
      )}
    </div>
  );
}
