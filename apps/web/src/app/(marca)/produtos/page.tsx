import { Suspense } from "react";
import { Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { ProductCard } from "@/features/products/product-card";
import { fxProducts } from "@/features/fixtures";
import { readFlags } from "@/features/fixtures/flags";
import { COPY } from "@/lib/copy";
import { CATEGORIA_LABEL } from "@/lib/labels";
import { cn } from "@/components/ui/cn";

/**
 * Tela [Marca] Produtos (seção 10): grade com selo de status, filtro por categoria, "Novo produto".
 * Arquivar fica no menu da tela do produto. Estados de design: `?estado=vazio`.
 */
export default function ProductsPage({ searchParams }: PageProps<"/produtos">) {
  return (
    <Suspense>
      <ProductsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ProductsContent({ searchParams }: { searchParams: PageProps<"/produtos">["searchParams"] }) {
  const sp = await searchParams;
  const flags = readFlags(sp);
  const categoria = typeof sp.categoria === "string" ? sp.categoria : undefined;
  const products = flags.estado === "vazio" ? [] : fxProducts.filter((p) => !categoria || p.categoria === categoria);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Produtos"
        action={<ButtonLink href="/produtos/novo" className="px-3"><Plus className="size-4.5" /> Novo</ButtonLink>}
      />
      {flags.estado === "vazio" ? (
        <EmptyState image="/images/vazio-produtos.jpg" text={COPY.produtosVazio} action={<ButtonLink href="/produtos/novo">Novo produto</ButtonLink>} />
      ) : (
        <>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {[["", "Todas"], ...Object.entries(CATEGORIA_LABEL)].map(([value, label]) => (
              <a
                key={value}
                href={value ? `?categoria=${value}` : "?"}
                className={cn(
                  "flex min-h-9 shrink-0 items-center rounded-full px-3.5 text-[14px] font-medium",
                  (categoria ?? "") === value ? "bg-text text-bg" : "bg-surface text-text",
                )}
              >
                {label}
              </a>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} {...p} />)}
          </div>
        </>
      )}
    </div>
  );
}
