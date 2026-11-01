"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient, createUserClient } from "../db/supabase";
import { getCurrentProfile, getRequestLocale } from "./profile";
import { getDictionary, isLocale, LOCALE_COOKIE } from "@/lib/i18n";

/** Estado devolvido pelos formulários de autenticação (useActionState). */
export type AuthFormState = { error?: string; ok?: string } | undefined;

/** Página inicial de cada perfil (seção 10): admin no painel, marca no Início. */
function homeFor(papel: string): string {
  return papel === "admin_plataforma" ? "/admin/marcas" : "/inicio";
}

/**
 * Entrar com e-mail e senha — só em desenvolvimento (MD-7; seções 6.1 e 10).
 * Recebe: estado anterior e o formulário (email, senha). Devolve: erro traduzido, ou redireciona
 * para a página inicial do perfil. Quem não tem perfil (outro app no Auth compartilhado) ou está
 * desativado é deslogado na hora (seção 6.3).
 */
export async function signIn(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const t = getDictionary(await getRequestLocale());
  // MD-7: em produção o login é só com Google; e-mail e senha ficam para testes locais.
  if (process.env.NODE_ENV !== "development") return { error: t.auth.erroGenerico };
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
 * Trocar o idioma da interface (MD-1): no menu do perfil e, sem sessão, nas telas públicas (Entrar,
 * Pedir convite). Recebe: o idioma ("pt_br" | "en"). Atualiza o cookie do idioma; com sessão, grava
 * também `perfis.idioma` só na linha do próprio usuário (escrita em perfis é só servidor, seção 6.4).
 * Devolve: nada.
 */
export async function setLanguage(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", sameSite: "lax" });
  const profile = await getCurrentProfile();
  if (profile) await createAdminClient().from("perfis").update({ idioma: locale }).eq("id", profile.id);
}
