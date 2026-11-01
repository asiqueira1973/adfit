import { describe, expect, it } from "vitest";
import { CLAUSULA_IMAGEM } from "../prompts/clauses";
import type { AiClient, Script } from "../claude/types";
import { buildFramePrompt, FRAME_DRESS_LINE, FRAME_REFERENCE_LINE, FRAME_SAFE_RETRY_LINE, qcApproved, stripBodyTerms } from "./frames";
import { defaultModelGender } from "@/features/ads/new-ad-wizard";
import { buildScriptSystem, fitScreenText, sanitizeScreenTexts } from "./script";
import { PROMPT_VERSIONS } from "../prompts";

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
    expect(p).toContain("Fix from the previous attempt: Logo is missing on the front");
    expect(p.endsWith(CLAUSULA_IMAGEM)).toBe(true);
  });
});

describe("proteção contra o filtro de conteúdo (1º teste real: cena 3 barrada como nsfw)", () => {
  it("remove do prompt da cena os trechos que descrevem partes do corpo, sem tocar na peça", () => {
    const p = stripBodyTerms("Medium shot in a gym, woman standing after finishing a set, hands on hips, chest rising from breathing, looking to the side, wearing the black racerback sports bra with white wave logo and plain black leggings, no text.");
    expect(p).toBe("Medium shot in a gym, woman standing after finishing a set, looking to the side, wearing the black racerback sports bra with white wave logo and plain black leggings, no text.");
    expect(stripBodyTerms("Tight shot of her curves, sexy pose. Low angle of the barbell.")).toBe("Low angle of the barbell.");
  });
  it("o prompt montado já sai sem os termos; a nova tentativa depois de nsfw acrescenta o enquadramento discreto", () => {
    const p = buildFramePrompt("Hero shot, chest slightly lifted, confident gaze, gym", "Model");
    expect(p).not.toMatch(/chest|lifted/i);
    const retry = buildFramePrompt("Hero shot, confident gaze, gym", "Model", null, true);
    expect(retry).toContain(FRAME_SAFE_RETRY_LINE);
    expect(retry.endsWith(CLAUSULA_IMAGEM)).toBe(true);
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

describe("roteiro em uso (PROMPT_VERSIONS)", () => {
  it("preenche os placeholders, inclui as tabelas C.5 e o idioma do texto", () => {
    const { versao, texto } = buildScriptSystem({ genero_modelo: "mulher", faixa_etaria: "de_30_a_45", formato: "horizontal_16_9", tom_de_voz: null, idioma_texto: "en", idioma_descricao: "pt_br" });
    expect(versao).toBe(PROMPT_VERSIONS.roteiro);
    expect(texto).not.toMatch(/\{[a-z_]+\}/);
    expect(texto).toContain("Modelo: mulher, aparência de 30 a 45 anos");
    expect(texto).toContain("Proporção horizontal 16:9");
    expect(texto).toContain("texto_tela (inglês)");
    expect(texto).toContain("| hyrox |");
    expect(texto).toContain("| cinematográfico |");
    expect(texto).toContain("campo `modelo`");
    // roteiro.v3: nada de descrever partes do corpo (filtro de conteúdo da Higgsfield).
    expect(texto).toContain("nunca por partes do corpo");
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
  it("texto substituto só usa a descrição se ela estiver no idioma do vídeo; senão a cena fica sem texto", async () => {
    const r = await sanitizeScreenTexts(script("Lose weight fast", "Stays in place"), true, "en", reviewer(), "pt_br");
    expect(r[1]).toBeNull();
    expect(r[2]).toBe("Stays in place");
  });
  it("revisão indisponível mantém o texto já checado pela regex", async () => {
    const broken = { reviewTexts: async () => Promise.reject(new Error("x")) } as unknown as AiClient;
    expect(await sanitizeScreenTexts(script("Bora treinar", "Segura no lugar"), true, "pt_br", broken)).toEqual({ 1: "Bora treinar", 2: "Segura no lugar", 3: null });
  });
});

describe("padrões do assistente (critério 8.5)", () => {
  it("modelo derivado do gênero-alvo: feminino→mulher, masculino→homem, unissex→mulher", () => {
    expect(defaultModelGender("feminino")).toBe("mulher");
    expect(defaultModelGender("masculino")).toBe("homem");
    expect(defaultModelGender("unissex")).toBe("mulher");
  });
});
