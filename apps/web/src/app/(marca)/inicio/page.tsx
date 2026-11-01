import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, CircleHelp, Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, ListGroup, ListRow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Banner, EmptyState } from "@/components/ui/feedback";
import { AdCard } from "@/features/ads/ad-card";
import { brandContext } from "@/server/brand/context";
import { listAds } from "@/server/ads/service";
import { listProducts } from "@/server/products/queries";

/**
 * Tela [Marca] Início (seção 10): saldo, "Novo anúncio", últimos 6 anúncios, produtos sem ficha
 * (ou preparando), lembrete de logo (seção 9.1.5) e o atalho "Como funciona". Dados reais da marca.
 */
export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-80 animate-pulse rounded-[14px] bg-surface" />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const { profile, brand, t, intl } = await brandContext();
  const i = t.inicio;
  const [ads, products] = await Promise.all([listAds(profile.marcaId), listProducts(profile.marcaId)]);
  const empty = products.length === 0;
  const withoutSheet = products.filter((p) => p.status !== "pronto");
  const hasReady = products.some((p) => p.status === "pronto");

  return (
    <div className="flex flex-col gap-7">
      <Card className="flex items-center justify-between gap-4 p-5">
        <div>
          <div className="text-[13px] font-medium text-text-2">{i.seuSaldo}</div>
          <div className="flex items-baseline gap-1.5">
            <span className="tabular text-[40px] font-bold leading-none tracking-tight">{brand?.saldo_creditos ?? 0}</span>
            <span className="text-[15px] text-text-2">{i.creditos}</span>
          </div>
        </div>
        <Link href="/creditos/comprar" className="text-[15px] font-semibold text-brand-text">{i.comprar}</Link>
      </Card>

      <ButtonLink href={hasReady ? "/anuncios/novo" : "/produtos/novo"} className="h-13 text-[17px]">
        <Plus className="size-5" /> {hasReady ? i.novoAnuncio : i.novoProduto}
      </ButtonLink>

      {!brand?.logo_path && (
        <Banner tone="info" action={<Link href="/marca" className="shrink-0 font-semibold text-brand-text">{i.adicionar}</Link>}>
          {t.copy.lembreteLogo}
        </Banner>
      )}

      {empty ? (
        <>
          <EmptyState image="/images/vazio-produtos.jpg" text={t.copy.inicioVazio} />
          <Link href="/como-funciona" className="flex items-center justify-center gap-2 text-[15px] font-semibold text-brand-text">
            <CircleHelp className="size-4.5" /> {i.comoFunciona}
          </Link>
        </>
      ) : (
        <>
          {ads.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[22px] font-bold tracking-tight">{i.ultimosAnuncios}</h2>
                <Link href="/anuncios" className="text-[15px] font-medium text-brand-text">{i.verTodos}</Link>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3">
                {ads.slice(0, 6).map((a) => (
                  <AdCard key={a.id} id={a.id} titulo={a.titulo} status={a.status} thumb={a.thumb} criado_em={a.criadoEm} label={t.opcoes.statusAnuncio[a.status]} locale={intl} />
                ))}
              </div>
            </section>
          )}

          {withoutSheet.length > 0 && (
            <ListGroup title={i.produtosSemFicha}>
              {withoutSheet.map((p) => (
                <Link key={p.id} href={`/produtos/${p.id}`} className="block hover:bg-text/[0.03]">
                  <ListRow
                    label={p.nome}
                    value={
                      <span className="flex items-center gap-2">
                        <Badge tone={p.status === "gerando" ? "processing" : "neutral"}>{p.status === "gerando" ? t.produtos.preparandoFicha : t.produtos.semFicha}</Badge>
                        <ChevronRight className="size-4" />
                      </span>
                    }
                  />
                </Link>
              ))}
            </ListGroup>
          )}
        </>
      )}
    </div>
  );
}
