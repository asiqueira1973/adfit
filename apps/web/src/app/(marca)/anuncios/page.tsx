import { Suspense } from "react";
import { Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { AdCard } from "@/features/ads/ad-card";
import { brandContext } from "@/server/brand/context";
import { listAds } from "@/server/ads/service";

/**
 * Tela [Marca] Anúncios (seção 10): anúncios da marca, mais recentes primeiro, com selo de status
 * (12.2) e miniatura da cena 1. Os filtros por produto e status da biblioteca entram no 8.8.
 */
export default function AdsPage() {
  return (
    <Suspense fallback={<div className="h-80 animate-pulse rounded-[14px] bg-surface" />}>
      <AdsContent />
    </Suspense>
  );
}

async function AdsContent() {
  const { profile, t, intl } = await brandContext();
  const ads = await listAds(profile.marcaId);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t.anuncios.titulo} action={<ButtonLink href="/anuncios/novo" className="px-3"><Plus className="size-4.5" /> {t.anuncios.novo}</ButtonLink>} />
      {ads.length === 0 ? (
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
