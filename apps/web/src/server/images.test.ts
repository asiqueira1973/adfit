import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { toJpeg } from "./images";

/**
 * Entrada das gerações sempre em JPEG de verdade (bug em produção, 01/11/2026: foto com nome .jpg e
 * tipo image/jpeg que por dentro era HEIF; o Grok respondeu "media format is not supported").
 */
describe("toJpeg", () => {
  const base = () => sharp({ create: { width: 64, height: 48, channels: 3, background: { r: 200, g: 30, b: 30 } } });

  it("converte HEIF/AVIF disfarçado de .jpg para JPEG", async () => {
    const heif = await base().avif().toBuffer();
    const out = await toJpeg(new Uint8Array(heif));
    expect((await sharp(out).metadata()).format).toBe("jpeg");
  });

  it("converte PNG e WEBP, e mantém JPEG como JPEG", async () => {
    for (const buf of [await base().png().toBuffer(), await base().webp().toBuffer(), await base().jpeg().toBuffer()]) {
      expect((await sharp(await toJpeg(new Uint8Array(buf))).metadata()).format).toBe("jpeg");
    }
  });

  it("arquivo que não é imagem gera erro", async () => {
    await expect(toJpeg(new TextEncoder().encode("não sou imagem"))).rejects.toThrow();
  });
});
