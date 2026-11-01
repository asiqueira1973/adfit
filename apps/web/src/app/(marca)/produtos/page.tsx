import { Suspense } from "react";
import { Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { cn } from "@/components/ui/cn";
import { ProductCard } from "@/features/products/product-card";
import { brandContext } from "@/server/brand/context";
import { listProducts } from "@/server/products/queries";

/**
 * Tela [Marca] Produtos (seção 10; critério 8.3): grade dos produtos da marca com selo de status,
 * filtro por categoria (`?categoria=`), "Novo produto" e estado vazio com a copy da seção 15.
 */
export default function ProductsPage({ searchParams }: PageProps<"/produtos">) {
  return (
    <Suspense fallback={<div className="h-60 animate-pulse rounded-[14px] bg-surface" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/produtos">["searchParams"] }) {
  const { profile, t } = await brandContext();
  const sp = await searchParams;
  const categoria = typeof sp.categoria === "string" && sp.categoria in t.categorias ? sp.categoria : undefined;
  const products = await listProducts(profile.marcaId, categoria);
  const statusLabel = { sem_ficha: t.produtos.semFicha, gerando: t.produtos.preparandoFicha, pronto: t.produtos.prontoParaAnuncio };
  const nothingAtAll = products.length === 0 && !categoria;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t.produtos.titulo} action={<ButtonLink href="/produtos/novo" className="px-3"><Plus className="size-4.5" /> {t.produtos.novo}</ButtonLink>} />
      {nothingAtAll ? (
        <EmptyState image="/images/vazio-produtos.jpg" text={t.copy.produtosVazio} action={<ButtonLink href="/produtos/novo">{t.produtos.novoProduto}</ButtonLink>} />
      ) : (
        <>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {[["", t.produtos.todas], ...Object.entries(t.categorias)].map(([value, label]) => (
              <a key={value} href={value ? `?categoria=${value}` : "?"} className={cn("flex min-h-9 shrink-0 items-center rounded-full px-3.5 text-[14px] font-medium", (categoria ?? "") === value ? "bg-text text-bg" : "bg-surface text-text")}>
                {label}
              </a>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} id={p.id} nome={p.nome} categoria={t.categorias[p.categoria]} status={p.status} imagem={p.imagem} statusLabel={statusLabel[p.status]} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
