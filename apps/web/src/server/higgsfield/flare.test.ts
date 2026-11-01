import { describe, expect, it } from "vitest";
import { buildImageBody, isKnownImageModel } from "./models";

/**
 * Emenda MD-12 (01/11/2026): imagens das cenas no Marketing Studio 2.5 Flare. O Grok barrou como nsfw
 * toda variação de "mulher correndo de top" (testado direto na Higgsfield); o Flare gerou as mesmas
 * cenas com a modelo e a peça fiéis. A ficha continua no Grok (`modelo_imagem`).
 */
describe("Marketing Studio 2.5 Flare", () => {
  it("é um modelo de imagem conhecido e manda a ficha como referência, sem enhance", () => {
    expect(isKnownImageModel("marketing-studio/image/flare")).toBe(true);
    expect(buildImageBody("marketing-studio/image/flare", { prompt: "p", imageUrls: ["u1"], aspectRatio: "16:9" })).toEqual({
      prompt: "p",
      image_urls: ["u1"],
      aspect_ratio: "16:9",
      resolution: "2k",
      quality: "high",
      enhance_prompt: false,
    });
  });
});
