import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/features/auth/auth-layout";
import { ForgotPasswordForm, SetPasswordForm } from "@/features/auth/auth-forms";
import { getDictionary } from "@/lib/i18n";
import { getCurrentProfile, getRequestLocale } from "@/server/auth/profile";

/**
 * Tela [Público] Redefinir senha (seção 6.2): sem `etapa`, pede o e-mail ("esqueci minha senha");
 * com `?etapa=nova` (vindo do link do e-mail, sessão criada em /auth/confirm) pede a nova senha.
 */
export default function ResetPasswordPage({ searchParams }: PageProps<"/redefinir-senha">) {
  return (
    <Suspense>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/redefinir-senha">["searchParams"] }) {
  const t = getDictionary(await getRequestLocale());
  const { etapa } = await searchParams;
  if (etapa === "nova") {
    if (!(await getCurrentProfile())) redirect("/entrar?erro=link_invalido");
    return (
      <AuthLayout title={t.auth.novaSenhaTitulo} subtitle={t.auth.senhaDica} madeBy={t.copy.feitoPor} image={false}>
        <SetPasswordForm t={t.auth} firstAccess={false} />
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title={t.auth.esqueciTitulo} subtitle={t.auth.esqueciSubtitulo} madeBy={t.copy.feitoPor} image={false}>
      <ForgotPasswordForm t={t.auth} />
    </AuthLayout>
  );
}
