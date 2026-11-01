/**
 * Formatação de números e dinheiro da interface (seções 8.9 e 16.2).
 */

/**
 * Formata um valor em centavos na moeda do pacote com Intl.NumberFormat (critério 8.9).
 * Recebe: centavos e código ISO 4217 minúsculo. Devolve: ex. "US$ 30,00".
 */
export function formatMoney(cents: number, currency: string, locale = "pt-BR"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

/**
 * Rótulo de custo de um botão cobrado (princípio 4): "· 2 créditos", "· 1 crédito" ou "· grátis".
 * Recebe: quantidade de créditos. Devolve: o sufixo do rótulo.
 */
export function costSuffix(
  credits: number,
  labels: { credito: string; creditos: string; gratis: string } = { credito: "crédito", creditos: "créditos", gratis: "grátis" },
): string {
  if (credits === 0) return labels.gratis;
  return `${credits} ${credits === 1 ? labels.credito : labels.creditos}`;
}

/** Créditos com sinal para o extrato: "+100", "−2". */
export function signedCredits(n: number): string {
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}

/**
 * Custo em créditos de um anúncio típico sem refação (regra 11.1: criar anúncio + gerar vídeo),
 * lido dos preços atuais — com o MD-4, 2 + 51 = 53. Recebe: preços por ação. Devolve: créditos.
 */
export function typicalAdCost(prices: Partial<Record<string, number>>): number {
  return (prices.gerar_roteiro_quadros ?? 0) + (prices.gerar_video ?? 0);
}

/**
 * Quantos anúncios típicos um pacote rende (seção 15, com o custo real do MD-4 no lugar do
 * "÷ 20" fixo): créditos ÷ custo do anúncio típico, para baixo. Recebe: créditos e custo.
 * Devolve: número inteiro de anúncios (0 se o custo for 0).
 */
export function typicalAds(credits: number, adCost: number): number {
  return adCost > 0 ? Math.floor(credits / adCost) : 0;
}

/** Data curta no idioma: "31/10/2026" (pt-BR) ou "10/31/2026" (en-US). */
export function formatDate(iso: string, locale = "pt-BR"): string {
  return new Intl.DateTimeFormat(locale, { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

/** Data e hora curtas pt-BR: "31/10, 14:05". */
export function formatDateTime(iso: string, locale = "pt-BR"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}
