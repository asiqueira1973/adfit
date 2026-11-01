import { Suspense, type ReactNode } from "react";
import { Banner } from "@/components/ui/feedback";
import { BrandShell, BrandShellSkeleton } from "@/features/shell/brand-shell";
import { getDictionary } from "@/lib/i18n";
import { fill } from "@/lib/copy";
import { requireBrandUser } from "@/server/auth/profile";
import { getBrandSummary, getSupportContact } from "@/server/brand/queries";

/**
 * Layout das telas da marca (usuario_marca, seção 5). Exige sessão de marca ativa, carrega nome,
 * saldo (topo de todas as telas, critério 8.8) e mostra "Conta pausada" se `marcas.ativa = false`
 * (seção 6.3). A leitura da sessão fica dentro do Suspense (Cache Components).
 */
export default function BrandLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<BrandShellSkeleton />}>
      <BrandFrame>{children}</BrandFrame>
    </Suspense>
  );
}

async function BrandFrame({ children }: { children: ReactNode }) {
  const profile = await requireBrandUser();
  const t = getDictionary(profile.idioma);
  const brand = await getBrandSummary(profile.marcaId);
  const paused = brand ? !brand.ativa : false;
  const banner = paused ? <Banner tone="warning">{fill(t.copy.contaPausada, { contato_suporte: await getSupportContact() })}</Banner> : undefined;
  return (
    <BrandShell balance={brand?.saldo_creditos ?? 0} paused={paused} userName={profile.nome} brandName={brand?.nome ?? ""} locale={profile.idioma} t={t} banner={banner}>
      {children}
    </BrandShell>
  );
}
