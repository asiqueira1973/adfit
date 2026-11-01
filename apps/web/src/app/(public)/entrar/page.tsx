import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { AuthLayout } from "@/features/auth/auth-layout";
import { SignInForm } from "@/features/auth/auth-forms";
import { GoogleButton } from "@/features/auth/google-button";
import { Banner } from "@/components/ui/feedback";
import { getDictionary } from "@/lib/i18n";
import { getRequestLocale } from "@/server/auth/profile";

/**
 * Tela [Público] Entrar (seção 10; MD-5/MD-7; revisão de layout pedida pelo Alexandre em 01/11/2026):
 * marca AdFit em destaque, proposta de valor, os 3 passos, "Entrar com Google" e "Pedir um convite"
 * (MD-9). `?erro=link_invalido|sem_acesso` mostra o aviso. Em desenvolvimento aparece também a
 * entrada por e-mail e senha usada pelos testes (nunca em produção).
 */
export default function SignInPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <Suspense>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/entrar">["searchParams"] }) {
  const locale = await getRequestLocale();
  const t = getDictionary(locale);
  const { erro } = await searchParams;
  const notice = erro === "link_invalido" ? t.auth.linkInvalido : erro === "sem_acesso" ? t.auth.semAcesso : undefined;
  return (
    <AuthLayout title={t.auth.heroTitulo} subtitle={t.auth.heroSubtitulo} madeBy={t.copy.feitoPor}>
      <ol className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">
        {t.auth.heroPassos.map((p, i) => (
          <li key={p} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="size-4 text-text-2" aria-hidden />}
            <span className="flex items-center gap-1.5 rounded-full bg-brand-pill px-3 py-1.5">
              <span className="flex size-5 items-center justify-center rounded-full bg-text text-[11px] text-bg">{i + 1}</span>
              {p}
            </span>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-4 rounded-[16px] border border-hairline p-5">
        {notice && <Banner tone="danger">{notice}</Banner>}
        <p className="text-[15px] font-semibold">{t.auth.entrarCom}</p>
        <GoogleButton locale={locale === "en" ? "en" : "pt-BR"} errorLabel={t.auth.erroGenerico} noAccessLabel={t.auth.semAcesso} />
        {process.env.NODE_ENV === "development" && (
          <details className="rounded-[12px] border border-dashed border-hairline p-3">
            <summary className="cursor-pointer text-[13px] text-text-2">{t.auth.entradaDev}</summary>
            <div className="pt-3"><SignInForm t={t.auth} /></div>
          </details>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[15px]">
        <span className="text-text-2">{t.auth.semAcessoAinda}</span>
        <Link href="/pedir-convite" className="inline-flex items-center gap-1 font-semibold text-brand-text">
          {t.auth.pedirConvite} <ArrowRight className="size-4" />
        </Link>
      </div>
    </AuthLayout>
  );
}
