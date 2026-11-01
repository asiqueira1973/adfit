import { Suspense } from "react";
import { PageHeader } from "@/components/ui/feedback";
import { NewProductForm } from "@/features/products/new-product-form";
import { readFlags } from "@/features/fixtures/flags";

/**
 * Tela [Marca] Novo produto (seção 10). Estados de design: `?estado=enviando|erro|vazio`.
 */
export default function NewProductPage({ searchParams }: PageProps<"/produtos/novo">) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader title="Novo produto" subtitle="Pode ser foto de celular, no cabide ou em cima da mesa." />
      <Suspense>
        <Form searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/produtos/novo">["searchParams"] }) {
  const flags = readFlags(await searchParams);
  return <NewProductForm initialState={flags.estado} />;
}
