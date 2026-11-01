/**
 * Formatação de números e dinheiro da interface (seções 8.9 e 16.2).
 */

/**
 * Formata um valor em centavos na moeda do pacote com Intl.NumberFormat (critério 8.9).
 * Recebe: centavos e código ISO 4217 minúsculo. Devolve: ex. "US$ 30,00".
 */
export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100,
  );
}

/**
 * Rótulo de custo de um botão cobrado (princípio 4): "· 2 créditos", "· 1 crédito" ou "· grátis".
 * Recebe: quantidade de créditos. Devolve: o sufixo do rótulo.
 */
export function costSuffix(credits: number): string {
  if (credits === 0) return "grátis";
  return `${credits} ${credits === 1 ? "crédito" : "créditos"}`;
}

/** Créditos com sinal para o extrato: "+100", "−2". */
export function signedCredits(n: number): string {
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}

/**
 * Quantos anúncios típicos um pacote rende (seção 15: créditos ÷ 20, para baixo).
 * Recebe: créditos do pacote. Devolve: número inteiro de anúncios.
 */
export function typicalAds(credits: number): number {
  return Math.floor(credits / 20);
}

/** Data curta pt-BR: "31/10/2026". */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

/** Data e hora curtas pt-BR: "31/10, 14:05". */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}
