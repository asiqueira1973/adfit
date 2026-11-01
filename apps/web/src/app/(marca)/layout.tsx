import { Suspense } from "react";
import { BrandShell } from "@/features/shell/brand-shell";
import { BalancePill, PausedBanner } from "@/features/shell/design-balance";
import { fxBrand, fxUser } from "@/features/fixtures";

/**
 * Layout das telas da marca (usuario_marca). Fase de design: dados das fixtures;
 * no épico 8.1 passa a exigir sessão e a carregar marca/perfil do Supabase.
 */
export default function BrandLayout({ children }: LayoutProps<"/">) {
  return (
    <BrandShell
      userName={fxUser.nome}
      brandName={fxBrand.nome}
      balance={<Suspense fallback={<span className="w-20" />}><BalancePill /></Suspense>}
      banner={<Suspense><PausedBanner /></Suspense>}
    >
      {children}
    </BrandShell>
  );
}
