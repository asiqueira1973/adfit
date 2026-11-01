"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient, createUserClient } from "../db/supabase";
import { publicServerEnv } from "../env";
import { getCurrentProfile, getRequestLocale } from "./profile";
import { getDictionary, isLocale, LOCALE_COOKIE, localeFromAcceptLanguage } from "@/lib/i18n";

/** Estado devolvido pelos formulários de autenticação (useActionState). */
export type AuthFormState = { error?: string; ok?: string } | undefined;

/** Página inicial de cada perfil (seção 10): admin no painel, marca no Início. */
function homeFor(papel: string): string {
  return papel === "admin_plataforma" ? "/admin/marcas" : "/inicio";
}

/**
 * Entrar com e-mail e senha (seções 6.1 e 10, tela [Público] Entrar).
 * Recebe: estado anterior e o formulário (email, senha). Devolve: erro traduzido, ou redireciona
 * para a página inicial do perfil. Quem não tem perfil (outro app no Auth compartilhado) ou está
 * desativado é deslogado na hora (seção 6.3).
 */
export async function signIn(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const t = getDictionary(await getRequestLocale());
  const parsed = z.object({ email: z.string().email(), senha: z.string().min(1) }).safeParse({
    email: String(form.get("email") ?? "").trim(),
    senha: String(form.get("senha") ?? ""),
  });
  if (!parsed.success) return { error: t.auth.credenciaisInvalidas };

  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.senha });
  if (error) return { error: t.auth.credenciaisInvalidas };

  const profile = await getCurrentProfile();
  if (!profile) {
    await supabase.auth.signOut();
    return { error: t.auth.semAcesso };
  }
  if (!profile.ativo) {
    await supabase.auth.signOut();
    redirect("/acesso-desativado");
  }
  (await cookies()).set(LOCALE_COOKIE, profile.idioma, { path: "/", sameSite: "lax" });
  redirect(homeFor(profile.papel));
}

/**
 * Pedir link de recuperação de senha (seção 6.2, fluxo padrão do Supabase).
 * Recebe: estado anterior e o formulário (email). Devolve: sempre a mesma mensagem de sucesso,
 * para não revelar quais e-mails têm conta.
 */
export async function requestPasswordReset(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const t = getDictionary(await getRequestLocale());
  const email = String(form.get("email") ?? "").trim();
  if (z.string().email().safeParse(email).success) {
    const supabase = await createUserClient();
    await supabase.auth.resetPasswordForEmail(email, {
      // O modelo de e-mail acrescenta &token_hash=…&type=recovery a esta URL (supabase/templates).
      redirectTo: `${publicServerEnv().APP_URL}/auth/confirm?next=${encodeURIComponent("/redefinir-senha?etapa=nova")}`,
    });
  }
  return { ok: t.auth.linkEnviado };
}

/**
 * Definir a senha no primeiro acesso (convite) ou redefinir pelo link do e-mail (seção 6.2).
 * Recebe: estado anterior e o formulário (senha, confirmacao, primeiroAcesso). Valida mínimo de
 * 8 caracteres e confirmação. No primeiro acesso ajusta `perfis.idioma` ao idioma do navegador (MD-1).
 * Devolve: erro traduzido, ou redireciona para a página inicial do perfil.
 */
export async function setPassword(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const t = getDictionary(await getRequestLocale());
  const senha = String(form.get("senha") ?? "");
  const confirmacao = String(form.get("confirmacao") ?? "");
  if (senha.length < 8) return { error: t.auth.senhaCurta };
  if (senha !== confirmacao) return { error: t.auth.senhasDiferentes };

  const supabase = await createUserClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: t.auth.linkInvalido };
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { error: t.auth.erroGenerico };

  const profile = await getCurrentProfile();
  if (!profile) {
    await supabase.auth.signOut();
    return { error: t.auth.semAcesso };
  }
  if (form.get("primeiroAcesso") === "1") {
    const locale = localeFromAcceptLanguage((await headers()).get("accept-language"));
    await createAdminClient().from("perfis").update({ idioma: locale }).eq("id", profile.id);
    (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", sameSite: "lax" });
  }
  redirect(homeFor(profile.papel));
}

/**
 * Trocar o idioma da interface do próprio usuário (MD-1, menu do perfil).
 * Recebe: o idioma ("pt_br" | "en"). Grava em `perfis.idioma` só a linha do próprio usuário
 * (escrita em perfis é só servidor, seção 6.4) e atualiza o cookie da sessão.
 * Devolve: nada.
 */
export async function setLanguage(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  const profile = await getCurrentProfile();
  if (!profile) return;
  await createAdminClient().from("perfis").update({ idioma: locale }).eq("id", profile.id);
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", sameSite: "lax" });
}
