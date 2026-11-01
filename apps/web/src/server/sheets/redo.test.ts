import { describe, expect, it } from "vitest";
import { adjustedPromptSchema } from "../claude/types";
import { PROMPT_VERSIONS } from "../prompts";
import { buildFirstSheetPrompt, redoBasePrompt } from "./prompt";

/**
 * Bugs de 01/11/2026 (top azul-marinho, refação da ficha):
 * B-10 — a refação partiu do prompt da v1, gravado com a ficha.v2; as regras da versão atual (só marca
 *        visível por fora) não entraram e o "logo" de dentro foi levado para a frente.
 * B-11 — o resumo da refação veio com mais de 80 caracteres e a refação inteira falhou.
 */
describe("refação da ficha", () => {
  it("B-10: base gravada com versão antiga da ficha → recomeça do template atual", () => {
    const fresh = buildFirstSheetPrompt("top").base;
    expect(redoBasePrompt({ prompt_base: "old base", prompt_versao: "ficha.v2" }, "top")).toBe(fresh);
    expect(redoBasePrompt({ prompt_base: "old base", prompt_versao: "ficha.v2+refacao.v1" }, "top")).toBe(fresh);
  });

  it("B-10: base da versão atual (inclusive já refeita) é mantida", () => {
    const v = PROMPT_VERSIONS.ficha;
    expect(redoBasePrompt({ prompt_base: "current base", prompt_versao: v }, "top")).toBe("current base");
    expect(redoBasePrompt({ prompt_base: "current base", prompt_versao: `${v}+refacao.v1` }, "top")).toBe("current base");
    expect(redoBasePrompt(null, "top")).toBe(buildFirstSheetPrompt("top").base);
  });

  it("B-11: resumo longo é encurtado para 80 caracteres em vez de derrubar a refação", () => {
    const r = adjustedPromptSchema.safeParse({ prompt: "p", resumo_pt: "x".repeat(120) });
    expect(r.success).toBe(true);
    expect(r.success && r.data.resumo_pt.length).toBeLessThanOrEqual(80);
  });

  it("a ficha pede painéis sem rótulos de texto (FRONT/BACK apareceram na imagem)", () => {
    expect(buildFirstSheetPrompt("top").base).toMatch(/no text labels/i);
  });
});
