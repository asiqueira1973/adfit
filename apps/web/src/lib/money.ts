/**
 * Converte um valor digitado pelo admin em centavos (regra 11.2.6: compra exige valor pago > 0).
 * Aceita "1.234,56", "1234,56", "1,234.56", "1234.56", "30" e "R$ 30,00".
 * Recebe: o texto. Devolve: inteiro em centavos, ou null se não for um valor positivo válido.
 */
export function parseMoneyToCents(input: string): number | null {
  const raw = input.replace(/[^\d.,-]/g, "");
  if (!raw || raw.includes("-")) return null;
  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  const decimalSep = lastComma > lastDot ? "," : lastDot > lastComma ? "." : null;
  let normalized = raw;
  if (decimalSep) {
    const [intPart, decPart] = [raw.slice(0, raw.lastIndexOf(decimalSep)), raw.slice(raw.lastIndexOf(decimalSep) + 1)];
    // Separador com 3 dígitos depois e sem outro separador: é milhar ("1.234" = mil e duzentos).
    if (decPart.length === 3 && !/[.,]/.test(intPart)) normalized = intPart + decPart;
    else normalized = `${intPart.replace(/[.,]/g, "")}.${decPart}`;
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}
