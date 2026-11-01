import { Suspense } from "react";
import { NewAdWizard } from "@/features/ads/new-ad-wizard";
import { readFlags } from "@/features/fixtures/flags";

/**
 * Tela [Marca] Novo anúncio (seção 10). Estados de design: `?passo=1..5`, `?saldo=`, `?pausada=1`.
 */
export default function NewAdPage({ searchParams }: PageProps<"/anuncios/novo">) {
  return (
    <Suspense>
      <Wizard searchParams={searchParams} />
    </Suspense>
  );
}

async function Wizard({ searchParams }: { searchParams: PageProps<"/anuncios/novo">["searchParams"] }) {
  const sp = await searchParams;
  const flags = readFlags(sp);
  const step = Number(typeof sp.passo === "string" ? sp.passo : 1);
  return <NewAdWizard key={step} initialStep={step >= 1 && step <= 5 ? step : 1} balance={flags.saldo} paused={flags.pausada} />;
}
