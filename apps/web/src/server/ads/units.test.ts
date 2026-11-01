import { describe, expect, it } from "vitest";
import { CLAUSULA_IMAGEM } from "../prompts/clauses";
import type { AiClient, Script } from "../claude/types";
import { buildFramePrompt, FRAME_DRESS_LINE, FRAME_REFERENCE_LINE, qcApproved } from "./frames";
import { buildScriptSystem, fitScreenText, sanitizeScreenTexts } from "./script";

/** Peças puras do 8.5: prompt do quadro (C.2 + roteiro.v2), QC (11.5) e texto da tela (11.7, seção 20). */
describe("prompt do quadro", () => {
  it("cena + modelo única + referência à ficha + 'vista a peça' + cláusula fixa no fim (uma vez)", () => {
    const p = buildFramePrompt(`Low angle close-up of a squat. ${CLAUSULA_IMAGEM}`, "Woman in her late 20s, curly dark hair");
    expect(p.startsWith("Low angle close-up of a squat.")).toBe(true);
    expect(p).toContain("The model (same person in every scene): Woman in her late 20s, curly dark hair");
    expect(p).toContain(FRAME_REFERENCE_LINE);
    expect(p).toContain(FRAME_DRESS_LINE);
    expect(p.endsWith(CLAUSULA_IMAGEM)).toBe(true);
    expect(p.split(CLAUSULA_IMAGEM)).toHaveLength(2);
    expect(p).not.toContain("Fix from the previous attempt");
  });
  it("regeneração do QC leva o motivo antes da cláusula", () => {
    const p = buildFramePrompt("Scene", "Model", "Logo is missing on the chest");
    expect(p).toContain("Fix from the previous attempt: Logo is missing on the chest");
    expect(p.endsWith(CLAUSULA_IMAGEM)).toBe(true);
  });
});

describe("aprovação do QC (11.5, calculada pelo código)", () => {
  const ok = { fidelidade_peca: 7, logo_visivel_correto: 6, anatomia: 6, texto_espurio: false, conteudo_improprio: false, motivo: "" };
  it("aprova no limite e reprova abaixo de cada limite ou com texto espúrio/impróprio", () => {
    expect(qcApproved(ok)).toBe(true);
    expect(qcApproved({ ...ok, fidelidade_peca: 6.9 })).toBe(false);
    expect(qcApproved({ ...ok, logo_visivel_correto: 5 })).toBe(false);
    expect(qcApproved({ ...ok, anatomia: 5 })).toBe(false);
    expect(qcApproved({ ...ok, texto_espurio: true })).toBe(false);
    expect(qcApproved({ ...ok, conteudo_improprio: true })).toBe(false);
  });
});

describe("roteiro.v2", () => {
  it("preenche os placeholders, inclui as tabelas C.5 e o idioma do texto", () => {
    const { versao, texto } = buildScriptSystem({ genero_modelo: "mulher", faixa_etaria: "de_30_a_45", formato: "horizontal_16_9", tom_de_voz: null, idioma_texto: "en", idioma_descricao: "pt_br" });
    expect(versao).toBe("roteiro.v2");
    expect(texto).not.toMatch(/\{[a-z_]+\}/);
    expect(texto).toContain("Modelo: mulher, aparência de 30 a 45 anos");
    expect(texto).toContain("Proporção horizontal 16:9");
    expect(texto).toContain("texto_tela (inglês)");
    expect(texto).toContain("| hyrox |");
    expect(texto).toContain("| cinematográfico |");
    expect(texto).toContain("campo `modelo`");
  });
});

describe("texto da tela", () => {
  it("cabe em 2×32 quebrando por palavra; recusa o que não cabe ou tem emoji", () => {
    expect(fitScreenText("Sustentação que acompanha cada movimento seu")).toBe("Sustentação que acompanha cada\nmovimento seu");
    expect(fitScreenText("a ".repeat(40))).toBeNull();
    expect(fitScreenText("Treino 🔥")).toBeNull();
  });

  const script = (t1: string | null, t2: string | null): Script => ({
    conceito: "c",
    modelo: "m",
    cenas: [
      { ordem: 1, descricao: "Close no agachamento", prompt_quadro: "p", prompt_movimento: "m", texto_tela: t1 },
      { ordem: 2, descricao: "Peça em ação no levantamento", prompt_quadro: "p", prompt_movimento: "m", texto_tela: t2 },
      { ordem: 3, descricao: "Pose final", prompt_quadro: "p", prompt_movimento: "m", texto_tela: "não pode" },
    ],
  });
  const reviewer = (problemIdx: number[] = [], sugestao: string | null = null): AiClient =>
    ({ reviewTexts: async ({ textos }: { textos: string[] }) => ({ textos: textos.map((_, i) => ({ indice: i, problema: problemIdx.includes(i), sugestao })) }) }) as unknown as AiClient;

  it("com_texto = false e cena 3 ficam sem texto", async () => {
    expect(await sanitizeScreenTexts(script("Bora", "Firme"), false, "pt_br", reviewer())).toEqual({ 1: null, 2: null, 3: null });
    expect((await sanitizeScreenTexts(script("Bora", "Firme"), true, "pt_br", reviewer()))[3]).toBeNull();
  });
  it("termo proibido vira a descrição neutra; sugestão da revisão substitui texto com problema", async () => {
    const r = await sanitizeScreenTexts(script("Emagreça treinando", "Segura no lugar"), true, "pt_br", reviewer([1], "Fica firme em cada série"));
    expect(r[1]).toBe("Close no agachamento");
    expect(r[2]).toBe("Fica firme em cada série");
  });
  it("revisão indisponível mantém o texto já checado pela regex", async () => {
    const broken = { reviewTexts: async () => Promise.reject(new Error("x")) } as unknown as AiClient;
    expect(await sanitizeScreenTexts(script("Bora treinar", "Segura no lugar"), true, "pt_br", broken)).toEqual({ 1: "Bora treinar", 2: "Segura no lugar", 3: null });
  });
});
