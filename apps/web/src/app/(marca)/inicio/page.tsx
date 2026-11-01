import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, ListGroup, ListRow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Banner, EmptyState } from "@/components/ui/feedback";
import { AdCard } from "@/features/ads/ad-card";
import { fxAds, fxBrand, fxProducts, PRODUCT_BADGE } from "@/features/fixtures";
import { readFlags } from "@/features/fixtures/flags";
import { requireBrandUser } from "@/server/auth/profile";
import { getBrandSummary } from "@/server/brand/queries";
import { COPY } from "@/lib/copy";

/**
 * Tela [Marca] Início (seção 10): saldo, "Novo anúncio", últimos 6 anúncios, produtos sem ficha
 * e lembrete de logo (seção 9.1.5). Estados de design: `?estado=vazio`.
 */
export default function HomePage({ searchParams }: PageProps<"/inicio">) {
  return (
    <Suspense>
      <HomeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeContent({ searchParams }: { searchParams: PageProps<"/inicio">["searchParams"] }) {
  const flags = readFlags(await searchParams);
  // Saldo real da marca (critério 8.8); o restante da tela ainda usa fixtures até os épicos 8.3/8.8.
  const profile = await requireBrandUser();
  const brand = await getBrandSummary(profile.marcaId);
  const empty = flags.estado === "vazio";
  const ads = empty ? [] : fxAds.slice(0, 6);
  const withoutSheet = empty ? [] : fxProducts.filter((p) => p.status !== "pronto");

  return (
    <div className="flex flex-col gap-7">
      <Card className="flex items-center justify-between gap-4 p-5">
        <div>
          <div className="text-[13px] font-medium text-text-2">Seu saldo</div>
          <div className="flex items-baseline gap-1.5">
            <span className="tabular text-[40px] font-bold leading-none tracking-tight">{brand?.saldo_creditos ?? 0}</span>
            <span className="text-[15px] text-text-2">créditos</span>
          </div>
        </div>
        <Link href="/creditos/comprar" className="text-[15px] font-semibold text-brand-text">Comprar</Link>
      </Card>

      <ButtonLink href={empty ? "/produtos/novo" : "/anuncios/novo"} className="h-13 text-[17px]">
        <Plus className="size-5" /> {empty ? "Novo produto" : "Novo anúncio"}
      </ButtonLink>

      {!fxBrand.logo && (
        <Banner tone="info" action={<Link href="/marca" className="shrink-0 font-semibold text-brand-text">Adicionar</Link>}>
          {COPY.lembreteLogo}
        </Banner>
      )}

      {empty ? (
        <EmptyState image="/images/vazio-produtos.jpg" text={COPY.inicioVazio} />
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[22px] font-bold tracking-tight">Últimos anúncios</h2>
              <Link href="/anuncios" className="text-[15px] font-medium text-brand-text">Ver todos</Link>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3">
              {ads.map((a) => <AdCard key={a.id} {...a} />)}
            </div>
          </section>

          {withoutSheet.length > 0 && (
            <ListGroup title="Produtos sem ficha">
              {withoutSheet.map((p) => (
                <Link key={p.id} href={`/produtos/${p.id}`} className="block hover:bg-text/[0.03]">
                  <ListRow label={p.nome} value={<span className="flex items-center gap-2"><Badge tone={PRODUCT_BADGE[p.status].tone}>{PRODUCT_BADGE[p.status].label}</Badge><ChevronRight className="size-4" /></span>} />
                </Link>
              ))}
            </ListGroup>
          )}
        </>
      )}
    </div>
  );
}
