import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { dropCloseUpPanel } from "../images";
import { retryInput, type GenerationInput, type GenerationRow } from "./process";

/**
 * Bug de 01/11/2026 (top azul-marinho): o Grok barrou por conteúdo (nsfw) as 3 cenas e as 3 novas
 * tentativas. Reproduzido direto na Higgsfield: o gatilho é o 3º painel da ficha (close da gola por
 * dentro); sem ele, a mesma cena passa. A nova tentativa pós-nsfw manda a ficha sem esse painel.
 */
describe("nova tentativa de quadro barrado por conteúdo", () => {
  const entrada = {
    prompt: "p",
    prompt_base: "p",
    prompt_versao: "roteiro.v3+quadro.v2",
    referencias: ["produtos/m/p/fichas/v1.png"],
    aspect_ratio: "16:9",
    prompt_cena: "Medium shot on a sidewalk.",
    modelo: "Woman over 45",
  } as GenerationInput;
  const row = (tipo: GenerationRow["tipo"]) => ({ id: "g", tipo, tentativa: 1, marca_id: "m", entrada }) as unknown as GenerationRow;

  it("quadro barrado (nsfw) → ficha sem o painel do close", () => {
    expect(retryInput(row("quadro_chave"), "bloqueada_nsfw").sem_close).toBe(true);
  });

  it("falha comum ou outro tipo → entrada igual (ficha inteira)", () => {
    expect(retryInput(row("quadro_chave"), "falhou").sem_close).toBeUndefined();
    expect(retryInput(row("ficha_produto"), "bloqueada_nsfw").sem_close).toBeUndefined();
  });

  it("recorta os 2 primeiros painéis (frente e costas) da ficha de 3 painéis iguais", async () => {
    const sheet = await sharp({ create: { width: 1200, height: 675, channels: 3, background: "#EDEDED" } }).jpeg().toBuffer();
    const meta = await sharp(await dropCloseUpPanel(sheet)).metadata();
    expect(meta.width).toBe(800);
    expect(meta.height).toBe(675);
    expect(meta.format).toBe("jpeg");
  });

  it("MD-17: com personagem, a nova tentativa mantém a linha da personagem (2ª referência)", () => {
    const comPersonagem = { ...row("quadro_chave"), entrada: { ...entrada, personagem: true } } as unknown as GenerationRow;
    const r = retryInput(comPersonagem, "bloqueada_nsfw");
    expect(r.prompt).toContain("Reference image 2 is the character sheet");
    expect(r.personagem).toBe(true);
  });
});
