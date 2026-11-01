import { describe, expect, it } from "vitest";
import { REDO_SHORTCUTS } from "@/lib/redo-shortcuts";
import { loadPrompt, PROMPT_VERSIONS } from ".";
import { appendShortcutLines, buildRedoRequest, redoBodySchema } from "./redo-shortcuts";

/**
 * Atalhos de refação (pedido do Alexandre, 01/11/2026): cada atalho vira uma linha fixa em inglês,
 * acrescentada pelo CÓDIGO depois do ajuste do Claude (sem interpretação); o texto livre segue opcional.
 */
describe("atalhos de refação", () => {
  it("cada tipo tem atalhos próprios e o corpo da rota só aceita os do tipo", () => {
    expect(REDO_SHORTCUTS.ficha).toContain("texto_extra");
    expect(redoBodySchema("ficha").safeParse({ atalhos: ["cor", "logo"] }).success).toBe(true);
    expect(redoBodySchema("ficha").safeParse({ atalhos: ["movimento"] }).success).toBe(false);
    expect(redoBodySchema("clipe").safeParse({ atalhos: ["movimento"], instrucao: "mais devagar" }).success).toBe(true);
    expect(redoBodySchema("quadro").safeParse({}).success).toBe(true);
  });

  it("monta o pedido para o Claude, as linhas fixas e o registro", () => {
    const r = buildRedoRequest("ficha", ["texto_extra"], "  a alça é mais fina ");
    expect(r.pedido).toContain("a alça é mais fina");
    expect(r.linhas).toHaveLength(1);
    expect(r.linhas[0]).toMatch(/remove any text, label, tag/i);
    expect(r.registro).toContain("texto_extra");
    expect(buildRedoRequest("quadro", [], "").pedido).toBe("");
  });

  it("as linhas fixas entram no fim do prompt ajustado, sem repetir", () => {
    const { linhas } = buildRedoRequest("clipe", ["roupa_muda"], "");
    const once = appendShortcutLines("she runs", linhas);
    expect(once.endsWith(linhas[0])).toBe(true);
    expect(appendShortcutLines(once, linhas)).toBe(once);
  });

  it("refacao.v2: negação remove (nunca muda de lugar) e o pedido nunca acrescenta logo/texto", () => {
    expect(PROMPT_VERSIONS.refacao).toBe("refacao.v2");
    const { texto } = loadPrompt("refacao");
    expect(texto).toMatch(/nunca mude de lugar/i);
    expect(texto).toMatch(/atalhos/i);
  });
});
