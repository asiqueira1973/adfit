import { describe, expect, it } from "vitest";
import { photoExtension, validatePhoto } from "./photo-rules";

describe("validatePhoto (critério 8.3)", () => {
  it.each([
    ["image/jpeg", "a.jpg"],
    ["image/png", "a.png"],
    ["image/heic", "a.heic"],
    ["", "IMG_0001.HEIC"],
    ["image/webp", "a.webp"],
  ])("aceita %s %s até 10 MB", (type, name) => expect(validatePhoto({ type, name, size: 10 * 1024 * 1024 })).toBeNull());
  it("recusa arquivo maior que 10 MB", () => expect(validatePhoto({ type: "image/jpeg", name: "a.jpg", size: 10 * 1024 * 1024 + 1 })).toBe("tamanho"));
  it.each([["application/pdf", "a.pdf"], ["image/gif", "a.gif"], ["", "a.txt"]])("recusa formato %s", (type, name) =>
    expect(validatePhoto({ type, name, size: 100 })).toBe("formato"),
  );
  it("normaliza extensão", () => {
    expect(photoExtension("", "foto.JPEG")).toBe("jpg");
    expect(photoExtension("image/heif", "x")).toBe("heic");
  });
});
