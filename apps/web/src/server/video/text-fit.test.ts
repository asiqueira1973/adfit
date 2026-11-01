import { describe, expect, it } from "vitest";
import { fitTextImage } from "./text-image";

/** Verificador (01/11/2026; regra 11.8): texto da cena e CTA nunca passam da área útil do vídeo. */
describe("fitTextImage", () => {
  it("linha de 32 maiúsculas a 58 px e CTA de 40 caracteres cabem em 1080 − margens", async () => {
    const maxW = Math.round(1080 * 0.88);
    const scene = await fitTextImage(["ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEF"], 58, "#FFFFFF", maxW);
    const cta = await fitTextImage(["Compre agora pelo link da bio e aproveite"], 54, "#C6F432", maxW);
    expect(scene.width).toBeLessThanOrEqual(maxW);
    expect(cta.width).toBeLessThanOrEqual(maxW);
  });
  it("texto curto mantém o tamanho pedido", async () => {
    const a = await fitTextImage(["Oi"], 58, "#FFFFFF", 950);
    expect(a.height).toBeGreaterThan(58);
  });
});
