import { Suspense } from "react";
import { AuthLayout } from "@/features/auth/auth-layout";
import { SignInForm } from "@/features/auth/auth-forms";
import { GoogleButton } from "@/features/auth/google-button";
import { Banner } from "@/components/ui/feedback";
import { getDictionary } from "@/lib/i18n";
import { getRequestLocale } from "@/server/auth/profile";

/**
 * Tela [Público] Entrar (seção 10; emendas MD-5 e MD-7): só "Entrar com Google", no idioma da sessão
 * (MD-1). `?erro=link_invalido|sem_acesso` mostra o aviso. Em desenvolvimento aparece também a entrada
 * por e-mail e senha, usada pelos testes e capturas locais (nunca em produção).
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
    <AuthLayout title={t.auth.entrarTitulo} subtitle={t.auth.entrarSubtitulo} madeBy={t.copy.feitoPor}>
      <div className="flex flex-col gap-5">
        {notice && <Banner tone="danger">{notice}</Banner>}
        <GoogleButton locale={locale === "en" ? "en" : "pt-BR"} errorLabel={t.auth.erroGenerico} noAccessLabel={t.auth.semAcesso} />
        <p className="text-center text-[13px] text-text-2">{t.auth.soGoogle}</p>
        {process.env.NODE_ENV === "development" && (
          <details className="rounded-[12px] border border-dashed border-hairline p-3">
            <summary className="cursor-pointer text-[13px] text-text-2">{t.auth.entradaDev}</summary>
            <div className="pt-3"><SignInForm t={t.auth} /></div>
          </details>
        )}
      </div>
    </AuthLayout>
  );
}
