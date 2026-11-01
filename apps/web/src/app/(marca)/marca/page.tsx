import { PageHeader } from "@/components/ui/feedback";
import { BrandKitForm } from "@/features/brand/brand-kit-form";

/** Tela [Marca] Marca — kit da marca com prévia do fecho (seção 10). */
export default function BrandPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Marca" subtitle="Isso aparece no fim de todos os seus vídeos." />
      <BrandKitForm />
    </div>
  );
}
