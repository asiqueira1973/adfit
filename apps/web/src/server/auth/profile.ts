import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createUserClient } from "../db/supabase";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, localeFromAcceptLanguage, type Locale } from "@/lib/i18n";

export type Profile = {
  id: string;
  nome: string;
  email: string;
  papel: "admin_plataforma" | "usuario_marca";
  marcaId: string | null;
  idioma: Locale;
  ativo: boolean;
};

/**
 * Lê o usuário logado e o perfil dele (seções 5 e 6). Uma vez por requisição (React cache).
 * Recebe: nada (cookies da sessão). Devolve: o perfil, ou null sem sessão/sem perfil.
 * Usuário de outro app no Auth compartilhado não tem linha em `perfis` → null.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createUserClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("perfis")
    .select("id, nome, email, papel, marca_id, idioma, ativo")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, nome: data.nome, email: data.email, papel: data.papel, marcaId: data.marca_id, idioma: data.idioma, ativo: data.ativo };
});

/**
 * Exige usuário de marca ativo (matriz da seção 5). Admin vai para o painel; sem sessão, para /entrar;
 * desativado, para /acesso-desativado (seção 6.3).
 * Recebe: nada. Devolve: o perfil com marcaId garantido.
 */
export async function requireBrandUser(): Promise<Profile & { marcaId: string }> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/entrar");
  if (!profile.ativo) redirect("/acesso-desativado");
  if (profile.papel === "admin_plataforma" || !profile.marcaId) redirect("/admin/marcas");
  return profile as Profile & { marcaId: string };
}

/**
 * Exige admin_plataforma ativo (seção 13: "toda rota de admin confere eh_admin() no servidor").
 * Recebe: nada. Devolve: o perfil do admin.
 */
export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/entrar");
  if (!profile.ativo) redirect("/acesso-desativado");
  if (profile.papel !== "admin_plataforma") redirect("/inicio");
  return profile;
}

/**
 * Idioma da requisição (MD-1): cookie gravado pelo proxy a partir de `perfis.idioma`;
 * sem cookie, o idioma do navegador. Recebe: nada. Devolve: o idioma.
 */
export async function getRequestLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  return localeFromAcceptLanguage((await headers()).get("accept-language")) ?? DEFAULT_LOCALE;
}
