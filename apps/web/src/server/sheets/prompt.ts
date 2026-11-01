import "server-only";
import { CLAUSULA_IMAGEM } from "../prompts/clauses";
import { loadPrompt, render } from "../prompts";

/** Categoria do produto (enum `categoria`) em inglês para o `{categoria_en}` do Anexo C.1. */
const CATEGORY_EN: Record<string, string> = {
  top: "sports top",
  legging: "leggings",
  shorts: "athletic shorts",
  camiseta: "athletic t-shirt",
  regata: "athletic tank top",
  jaqueta: "athletic jacket",
  conjunto: "matching activewear set",
  outro: "activewear garment",
};

/** Prompt da ficha montado pelo código: `base` (sem cláusula, vai ao C.3 na refação) e `final` (enviado). */
export type SheetPrompt = { base: string; final: string; versao: string };

/** Anexa a cláusula fixa ao final (seção 20), tirando uma cópia que o Claude tenha devolvido. */
export function withImageClause(base: string): string {
  return `${base.replace(CLAUSULA_IMAGEM, "").trimEnd()}\n${CLAUSULA_IMAGEM}`;
}

/**
 * Prompt da versão 1 da ficha (Anexo C.1): template literal com `{instrucao_refacao_en}` vazio e a
 * cláusula fixa no fim. Recebe: categoria. Devolve: SheetPrompt.
 */
export function buildFirstSheetPrompt(categoria: string): SheetPrompt {
  const { versao, texto } = loadPrompt("ficha");
  const base = render(texto, { categoria_en: CATEGORY_EN[categoria] ?? CATEGORY_EN.outro, instrucao_refacao_en: "", CLAUSULA_IMAGEM: "" });
  return { base, final: withImageClause(base), versao };
}

/**
 * Prompt de uma refação da ficha: o texto ajustado pelo Claude (C.3, modo ficha) + a cláusula fixa
 * concatenada pelo código (o pedido do lojista nunca entra cru no prompt). Recebe: prompt ajustado.
 */
export function buildRedoSheetPrompt(adjusted: string): SheetPrompt {
  const { versao } = loadPrompt("ficha");
  const base = adjusted.replace(CLAUSULA_IMAGEM, "").trim();
  return { base, final: withImageClause(base), versao: `${versao}+${loadPrompt("refacao").versao}` };
}

/**
 * Prompt base de uma refação (Anexo C.3: o "prompt atual"). Bug B-10: base gravada com uma versão
 * antiga do template da ficha não carrega as regras novas; nesse caso recomeça do template atual.
 * Recebe: entrada da última geração com imagem (ou null) e categoria. Devolve: o prompt base.
 */
export function redoBasePrompt(last: { prompt_base?: string; prompt_versao?: string } | null, categoria: string): string {
  const current = loadPrompt("ficha").versao;
  const sameTemplate = last?.prompt_versao === current || last?.prompt_versao?.startsWith(`${current}+`);
  return last?.prompt_base && sameTemplate ? last.prompt_base : buildFirstSheetPrompt(categoria).base;
}
