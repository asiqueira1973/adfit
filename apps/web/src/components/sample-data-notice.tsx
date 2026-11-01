import { Suspense } from "react";
import { Banner } from "@/components/ui/feedback";
import { getDictionary } from "@/lib/i18n";
import { getRequestLocale } from "@/server/auth/profile";

/**
 * Aviso "dados de exemplo" nas telas que ainda usam os dados fictícios do design (Início, [Admin]
 * Custos e Gerações) até o épico 8.8 ligá-las ao banco — evita confundir número fictício com real.
 */
export function SampleDataNotice() {
  return (
    <Suspense>
      <Notice />
    </Suspense>
  );
}

async function Notice() {
  const t = getDictionary(await getRequestLocale());
  return <Banner tone="warning">{t.avisos.dadosExemplo}</Banner>;
}
