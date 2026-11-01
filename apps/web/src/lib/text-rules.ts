/**
 * Validação do texto da tela (regra 11.7): até 2 linhas de 32 caracteres, sem emoji.
 * Recebe: o texto. Devolve: null se válido ou a mensagem de erro em português.
 */
export function validateScreenText(text: string): string | null {
  const lines = text.split("\n");
  if (lines.length > 2) return "Use no máximo 2 linhas.";
  if (lines.some((l) => l.length > 32)) return "Cada linha pode ter até 32 caracteres.";
  if (/\p{Extended_Pictographic}/u.test(text)) return "Sem emoji no texto do vídeo.";
  return null;
}
