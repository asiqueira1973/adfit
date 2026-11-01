import { describe, expect, it } from "vitest";
import { CLAUSULA_IMAGEM } from "../prompts/clauses";
import { PROMPT_VERSIONS, render } from "../prompts";
import { buildFirstSheetPrompt, buildRedoSheetPrompt } from "./prompt";

/** Prompt da ficha (Anexo C.0 e C.1; seção 20: cláusula fixa concatenada pelo código). */
describe("prompt da ficha", () => {
  it("v1: template literal do C.1, categoria em inglês, sem linha vazia de refação e cláusula fixa uma vez no fim", () => {
    const p = buildFirstSheetPrompt("legging");
    expect(p.versao).toBe(PROMPT_VERSIONS.ficha);
    expect(p.final.startsWith("Create a clean product reference sheet of the exact leggings shown")).toBe(true);
    expect(p.final.endsWith(CLAUSULA_IMAGEM)).toBe(true);
    expect(p.final.split(CLAUSULA_IMAGEM)).toHaveLength(2);
    expect(p.final).not.toMatch(/\{[a-z_]+\}/i);
    expect(p.final).not.toMatch(/\n\n/);
    expect(p.base).not.toContain(CLAUSULA_IMAGEM);
  });

  it("refação: texto do Claude + cláusula fixa; cópia da cláusula devolvida pelo Claude não duplica", () => {
    const p = buildRedoSheetPrompt(`Adjusted prompt.\n${CLAUSULA_IMAGEM}`);
    expect(p.base).toBe("Adjusted prompt.");
    expect(p.final).toBe(`Adjusted prompt.\n${CLAUSULA_IMAGEM}`);
  });

  it("render remove só linhas que ficaram vazias por placeholder", () => {
    expect(render("a\n{x}\n\nb {y}", { y: "1" })).toBe("a\n\nb 1");
  });
});
