import { Suspense } from "react";
import { Lock } from "lucide-react";
import { PackagePicker } from "@/features/credits/package-picker";
import { Banner, PageHeader } from "@/components/ui/feedback";
import { fxPackages, SUPPORT_CONTACT } from "@/features/fixtures";
import { readFlags } from "@/features/fixtures/flags";
import { COPY, fill } from "@/lib/copy";

/**
 * Tela [Marca] Comprar créditos (seção 10 e critério 8.9): pacotes ativos na ordem de `ordem`,
 * preço na moeda do pacote, "Rende cerca de {n} anúncios" e "Pagar" (vai para a Stripe).
 * Estados de design: `?estado=abrindo`, `?pausada=1` (marca pausada não compra).
 */
export default function BuyCreditsPage({ searchParams }: PageProps<"/creditos/comprar">) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader title={COPY.comprarTitulo} subtitle="Os créditos entram no saldo assim que o pagamento é aprovado." />
      <Suspense>
        <Content searchParams={searchParams} />
      </Suspense>
      <p className="flex items-center justify-center gap-1.5 text-[12px] text-text-2">
        <Lock className="size-3.5" /> Pagamento processado pela Stripe
      </p>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/creditos/comprar">["searchParams"] }) {
  const flags = readFlags(await searchParams);
  if (flags.pausada) return <Banner tone="warning">{fill(COPY.contaPausada, { contato_suporte: SUPPORT_CONTACT })}</Banner>;
  const packages = fxPackages.filter((p) => p.ativo).sort((a, b) => a.ordem - b.ordem);
  return <PackagePicker packages={packages} opening={flags.estado === "abrindo"} />;
}
