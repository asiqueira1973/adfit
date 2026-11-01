"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";
import { TextField } from "@/components/ui/field";
import { requestPasswordReset, setPassword, signIn, type AuthFormState } from "@/server/auth/actions";
import type { Dictionary } from "@/lib/i18n";

/**
 * Formulário de entrada (tela [Público] Entrar, seção 10). Recebe: textos do idioma e um aviso
 * vindo da URL (link inválido, sem acesso). Devolve: o formulário ligado à action `signIn`.
 */
export function SignInForm({ t, notice }: { t: Dictionary["auth"]; notice?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signIn, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      {(state?.error ?? notice) && <Banner tone="danger">{state?.error ?? notice}</Banner>}
      <TextField label={t.email} name="email" type="email" autoComplete="email" inputMode="email" placeholder={t.emailPlaceholder} required />
      <TextField label={t.senha} name="senha" type="password" autoComplete="current-password" required />
      <Button type="submit" className="mt-2" disabled={pending}>{pending ? t.entrando : t.entrar}</Button>
      <Link href="/redefinir-senha" className="text-center text-[15px] font-medium text-brand-text">{t.esqueciSenha}</Link>
    </form>
  );
}

/**
 * Formulário de nova senha (seção 6.2): primeiro acesso (convite) ou redefinição.
 * Recebe: textos e se é primeiro acesso. Devolve: o formulário ligado à action `setPassword`.
 */
export function SetPasswordForm({ t, firstAccess }: { t: Dictionary["auth"]; firstAccess: boolean }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(setPassword, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && <Banner tone="danger">{state.error}</Banner>}
      <input type="hidden" name="primeiroAcesso" value={firstAccess ? "1" : "0"} />
      <TextField label={t.novaSenha} name="senha" type="password" autoComplete="new-password" minLength={8} required />
      <TextField label={t.confirmeSenha} name="confirmacao" type="password" autoComplete="new-password" minLength={8} required />
      <Button type="submit" className="mt-2" disabled={pending}>{pending ? t.salvando : t.salvar}</Button>
    </form>
  );
}

/**
 * Formulário "Esqueci minha senha" (seção 6.2). Recebe: textos. Devolve: o formulário ligado à
 * action `requestPasswordReset`, que sempre responde com a mesma mensagem.
 */
export function ForgotPasswordForm({ t }: { t: Dictionary["auth"] }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(requestPasswordReset, undefined);
  if (state?.ok) return <Banner tone="success">{state.ok}</Banner>;
  return (
    <form action={action} className="flex flex-col gap-4">
      <TextField label={t.email} name="email" type="email" autoComplete="email" required />
      <Button type="submit" className="mt-2" disabled={pending}>{pending ? t.enviando : t.enviarLink}</Button>
    </form>
  );
}
