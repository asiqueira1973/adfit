import { Suspense } from "react";
import { AuthLayout } from "@/features/auth/auth-layout";
import { SignInForm } from "@/features/auth/auth-forms";
import { getDictionary } from "@/lib/i18n";
import { getRequestLocale } from "@/server/auth/profile";

/**
 * Tela [Público] Entrar (seção 10): e-mail, senha e "Esqueci minha senha", no idioma da sessão (MD-1).
 * `?erro=link_invalido|sem_acesso` mostra o aviso correspondente.
 */
export default function SignInPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <Suspense>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/entrar">["searchParams"] }) {
  const t = getDictionary(await getRequestLocale());
  const { erro } = await searchParams;
  const notice = erro === "link_invalido" ? t.auth.linkInvalido : erro === "sem_acesso" ? t.auth.semAcesso : undefined;
  return (
    <AuthLayout title={t.auth.entrarTitulo} subtitle={t.auth.entrarSubtitulo} madeBy={t.copy.feitoPor}>
      <SignInForm t={t.auth} notice={notice} />
    </AuthLayout>
  );
}
