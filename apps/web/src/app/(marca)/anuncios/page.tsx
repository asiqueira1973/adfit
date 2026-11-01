import { Suspense } from "react";
import { Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { SelectField } from "@/components/ui/field";
import { AdCard } from "@/features/ads/ad-card";
import { AD_BADGE, fxAds, fxProducts } from "@/features/fixtures";
import { readFlags } from "@/features/fixtures/flags";

/**
 * Tela [Marca] Anúncios — biblioteca (seção 10 e critério 8.8): grade com filtro por produto e status.
 * Estados de design: `?estado=vazio` (foto de corredor ao amanhecer, seção 16.3).
 */
export default function AdsPage({ searchParams }: PageProps<"/anuncios">) {
  return (
    <Suspense>
      <AdsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdsContent({ searchParams }: { searchParams: PageProps<"/anuncios">["searchParams"] }) {
  const flags = readFlags(await searchParams);
  const empty = flags.estado === "vazio";
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Anúncios" action={<ButtonLink href="/anuncios/novo" className="px-3"><Plus className="size-4.5" /> Novo</ButtonLink>} />
      {empty ? (
        <EmptyState image="/images/vazio-anuncios.jpg" text="Nenhum anúncio ainda. Escolha um produto com ficha pronta e crie o primeiro." action={<ButtonLink href="/anuncios/novo">Novo anúncio</ButtonLink>} />
      ) : (
        <>
          <form className="grid grid-cols-2 gap-2">
            <SelectField label="Produto" name="produto" options={[{ value: "", label: "Todos" }, ...fxProducts.map((p) => ({ value: p.id, label: p.nome }))]} />
            <SelectField label="Status" name="status" options={[{ value: "", label: "Todos" }, ...Object.entries(AD_BADGE).map(([value, b]) => ({ value, label: b.label }))]} />
          </form>
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-4">
            {fxAds.map((a) => <AdCard key={a.id} {...a} />)}
          </div>
        </>
      )}
    </div>
  );
}
