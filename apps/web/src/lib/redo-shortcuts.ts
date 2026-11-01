/**
 * Códigos dos atalhos de refação por tipo (pedido do Alexandre, 01/11/2026). Compartilhado entre a
 * tela (rótulos no dicionário, `t.refazer.atalhos`) e o servidor (linhas fixas em inglês).
 */
export const REDO_SHORTCUTS = {
  ficha: ["cor", "logo", "texto_extra", "modelagem"],
  quadro: ["roupa", "logo", "texto_extra", "defeito_pessoa", "pose"],
  clipe: ["roupa_muda", "movimento", "parado", "texto_extra"],
} as const;

export type RedoKind = keyof typeof REDO_SHORTCUTS;
export type RedoShortcut = (typeof REDO_SHORTCUTS)[RedoKind][number];
