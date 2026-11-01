import "server-only";
import { getDictionary, intlLocale } from "@/lib/i18n";
import { requireBrandUser } from "../auth/profile";
import { getBrandSummary } from "./queries";

/**
 * Contexto das páginas da marca: perfil (exige usuario_marca ativo), marca (nome, saldo, ativa),
 * dicionário e locale Intl. Recebe: nada. Devolve: { profile, brand, t, intl }.
 */
export async function brandContext() {
  const profile = await requireBrandUser();
  const brand = await getBrandSummary(profile.marcaId);
  return { profile, brand, t: getDictionary(profile.idioma), intl: intlLocale(profile.idioma) };
}
