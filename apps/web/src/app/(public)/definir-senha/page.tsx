import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/features/auth/auth-layout";
import { SetPasswordForm } from "@/features/auth/auth-forms";
import { getDictionary } from "@/lib/i18n";
import { getCurrentProfile, getRequestLocale } from "@/server/auth/profile";

/**
 * Tela [Público] Definir senha (seção 6.2): primeiro acesso pelo link do convite, que já criou a
 * sessão em /auth/confirm. Sem sessão, volta para /entrar.
 */
export default function SetPasswordPage() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const t = getDictionary(await getRequestLocale());
  if (!(await getCurrentProfile())) redirect("/entrar?erro=link_invalido");
  return (
    <AuthLayout title={t.auth.criarSenhaTitulo} subtitle={t.auth.senhaDica} madeBy={t.copy.feitoPor} image={false}>
      <SetPasswordForm t={t.auth} firstAccess />
    </AuthLayout>
  );
}
