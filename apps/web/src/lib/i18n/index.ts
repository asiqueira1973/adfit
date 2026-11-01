import { en } from "./en";
import { ptBR, type Dictionary } from "./pt-br";

/** Idiomas suportados — mesmos valores do enum `idioma` do banco (MD-1). */
export const LOCALES = ["pt_br", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "pt_br";

/** Cookie com o idioma da sessão, gravado pelo proxy (src/proxy.ts). */
export const LOCALE_COOKIE = "adfit_idioma";

const DICTIONARIES: Record<Locale, Dictionary> = { pt_br: ptBR, en };

/**
 * Devolve o dicionário do idioma pedido (MD-1).
 * Recebe: o idioma (qualquer texto). Devolve: o dicionário; pt-BR se o idioma não for suportado.
 */
export function getDictionary(locale: string | undefined | null): Dictionary {
  return DICTIONARIES[isLocale(locale) ? locale : DEFAULT_LOCALE];
}

/** Diz se o texto é um idioma suportado. */
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Escolhe o idioma pelo cabeçalho Accept-Language do navegador (antes do login e no 1º acesso).
 * Recebe: o cabeçalho. Devolve: "en" se o primeiro idioma preferido for inglês; senão pt-BR.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    if (tag.startsWith("pt")) return "pt_br";
    if (tag.startsWith("en")) return "en";
  }
  return DEFAULT_LOCALE;
}

/** Locale BCP 47 para Intl (datas e dinheiro) a partir do idioma do app. */
export function intlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "pt-BR";
}

export type { Dictionary };
