import { Suspense } from "react";
import { PageHeader } from "@/components/ui/feedback";
import { NewProductForm } from "@/features/products/new-product-form";
import { JourneySteps } from "@/features/journey/journey-steps";
import { brandContext } from "@/server/brand/context";

/** Tela [Marca] Novo produto (seção 10; critério 8.3). */
export default function NewProductPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-80 max-w-xl animate-pulse rounded-[14px] bg-surface" />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const { profile, t } = await brandContext();
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <JourneySteps current="fotos" t={t.jornada} />
      <PageHeader title={t.produtos.novoProduto} subtitle={t.produtos.novoSubtitulo} />
      <NewProductForm marcaId={profile.marcaId} t={t} />
    </div>
  );
}
