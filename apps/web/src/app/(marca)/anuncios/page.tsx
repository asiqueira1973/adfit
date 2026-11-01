import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { SelectField } from "@/components/ui/field";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { AdCard } from "@/features/ads/ad-card";
import { brandContext } from "@/server/brand/context";
import { listAds } from "@/server/ads/service";
import { listProducts } from "@/server/products/queries";

/**
 * Tela [Marca] Anúncios (seção 10): anúncios da marca, mais recentes primeiro, com selo de status
 * (12.2) e miniatura da cena 1; filtros por produto e status (critério 8.8; `?produto=&status=`).
 */
export default function AdsPage({ searchParams }: PageProps<"/anuncios">) {
  return (
    <Suspense fallback={<div className="h-80 animate-pulse rounded-[14px] bg-surface" />}>
      <AdsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdsContent({ searchParams }: { searchParams: PageProps<"/anuncios">["searchParams"] }) {
  const { profile, t, intl } = await brandContext();
  const sp = await searchParams;
  const produto = typeof sp.produto === "string" && sp.produto ? sp.produto : null;
  const status = typeof sp.status === "string" && sp.status ? sp.status : null;
  const [ads, products] = await Promise.all([listAds(profile.marcaId, { produtoId: produto, status }), listProducts(profile.marcaId)]);
  const filtered = Boolean(produto || status);
  const a = t.anuncios;
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t.anuncios.titulo} action={<ButtonLink href="/anuncios/novo" className="px-3"><Plus className="size-4.5" /> {t.anuncios.novo}</ButtonLink>} />
      {(ads.length > 0 || filtered) && (
        <form className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_auto] md:max-w-2xl">
          <SelectField label={a.filtroProduto} name="produto" defaultValue={produto ?? ""} options={[{ value: "", label: a.filtroTodos }, ...products.map((p) => ({ value: p.id, label: p.nome }))]} />
          <SelectField
            label={a.filtroStatus}
            name="status"
            defaultValue={status ?? ""}
            options={[{ value: "", label: a.filtroTodos }, { value: "andamento", label: a.filtroAndamento }, ...(["aguardando_aprovacao", "pronto", "falhou"] as const).map((s) => ({ value: s, label: t.opcoes.statusAnuncio[s] }))]}
          />
          <Button type="submit" variant="secondary">{a.filtrar}</Button>
        </form>
      )}
      {ads.length === 0 && filtered ? (
        <p className="text-[15px] text-text-2">{a.nenhumComFiltro}</p>
      ) : ads.length === 0 ? (
        <EmptyState image="/images/vazio-anuncios.jpg" text={t.anuncios.vazio} action={<ButtonLink href="/anuncios/novo">{t.anuncios.novoAnuncio}</ButtonLink>} />
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-4">
          {ads.map((a) => (
            <AdCard key={a.id} id={a.id} titulo={a.titulo} status={a.status} thumb={a.thumb} criado_em={a.criadoEm} label={t.opcoes.statusAnuncio[a.status]} locale={intl} />
          ))}
        </div>
      )}
    </div>
  );
}
