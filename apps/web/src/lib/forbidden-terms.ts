/**
 * Lista fixa de termos proibidos no texto da tela (seção 20, "Guardrails de IA"), checada por regex.
 * Texto gerado pelo Claude com estes termos é descartado (servidor, épico 8.5); texto digitado
 * pelo usuário só recebe o aviso da seção 15 (regra 11.7).
 */
export const FORBIDDEN_TERMS: RegExp[] = [
  /emagre[cç]a/i,
  /perca\s+\d+([.,]\d+)?\s*(kg|quilos?)/i,
  /queima\s+gordura/i,
  /\bcura\b/i,
  /garantid[oa]s?/i,
];

/**
 * Diz se um texto contém algum termo proibido.
 * Recebe: o texto. Devolve: true se algum padrão casar.
 */
export function hasForbiddenTerm(text: string | null | undefined): boolean {
  if (!text) return false;
  return FORBIDDEN_TERMS.some((re) => re.test(text));
}
