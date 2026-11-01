import { Suspense } from "react";
import { Lock } from "lucide-react";
import { PackagePicker } from "@/features/credits/package-picker";
import { Banner, PageHeader } from "@/components/ui/feedback";
import { fill } from "@/lib/copy";
import { brandContext } from "@/server/brand/context";
import { listActionPrices, listActivePackages } from "@/server/brand/credits";
import { typicalAdCost } from "@/lib/format";
import { packagesForLocale } from "@/lib/pricing";
import { getSupportContact } from "@/server/brand/queries";

/**
 * Tela [Marca] Comprar créditos (seção 10; critério 8.9): só pacotes ativos, na ordem de `ordem`,
 * preço na moeda do pacote (Intl.NumberFormat), "Rende cerca de {n} anúncios" e "Pagar".
 * Marca pausada não compra (seção 6.3): mostra "Conta pausada…".
 */
export default function BuyCreditsPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-60 max-w-xl animate-pulse rounded-[14px] bg-surface" />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const { profile, brand, t, intl } = await brandContext();
  const [allPackages, prices] = await Promise.all([listActivePackages(), listActionPrices()]);
  // Moeda pelo idioma (MD-16): pt-BR paga em reais (conta Stripe brasileira), inglês em dólar.
  const packages = packagesForLocale(allPackages, profile.idioma);
  const adCost = typicalAdCost(Object.fromEntries(prices.map((p) => [p.acao, p.creditos])));
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader title={t.copy.comprarTitulo} subtitle={t.creditos.subtituloComprar} />
      {!brand?.ativa ? (
        <Banner tone="warning">{fill(t.copy.contaPausada, { contato_suporte: await getSupportContact() })}</Banner>
      ) : packages.length === 0 ? (
        <Banner tone="info">{t.creditos.nenhumPacote}</Banner>
      ) : (
        <PackagePicker
          packages={packages}
          intl={intl}
          adCost={adCost}
          labels={{ pagar: t.creditos.pagar, abrindo: t.copy.indoPagamento, rende: t.copy.pacoteRende, rende1: t.copy.pacoteRende1, creditos: t.custo.creditos, erro: t.erros.generico }}
        />
      )}
      <p className="flex items-center justify-center gap-1.5 text-[12px] text-text-2">
        <Lock className="size-3.5" /> {t.creditos.seloStripe}
      </p>
    </div>
  );
}
