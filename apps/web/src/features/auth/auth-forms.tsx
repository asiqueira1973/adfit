"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";
import { TextField } from "@/components/ui/field";
import { signIn, type AuthFormState } from "@/server/auth/actions";
import type { Dictionary } from "@/lib/i18n";

/**
 * Entrada por e-mail e senha — só em desenvolvimento (MD-7: em produção o login é só com Google).
 * Recebe: textos do idioma e um aviso opcional. Devolve: o formulário ligado à action `signIn`.
 */
export function SignInForm({ t, notice }: { t: Dictionary["auth"]; notice?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signIn, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      {(state?.error ?? notice) && <Banner tone="danger">{state?.error ?? notice}</Banner>}
      <TextField label={t.email} name="email" type="email" autoComplete="email" inputMode="email" placeholder={t.emailPlaceholder} required />
      <TextField label={t.senha} name="senha" type="password" autoComplete="current-password" required />
      <Button type="submit" className="mt-2" disabled={pending}>{pending ? t.entrando : t.entrar}</Button>
    </form>
  );
}
