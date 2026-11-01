import "server-only";
import { getDictionary, intlLocale } from "@/lib/i18n";
import { requireAdmin } from "../auth/profile";

/**
 * Contexto das páginas do admin: perfil (exige admin_plataforma, seção 13), dicionário e locale Intl.
 * Recebe: nada. Devolve: { profile, t, intl }.
 */
export async function adminContext() {
  const profile = await requireAdmin();
  return { profile, t: getDictionary(profile.idioma), intl: intlLocale(profile.idioma) };
}
