import "server-only";
import sharp from "sharp";
import convertHeic from "heic-convert";

/**
 * Converte qualquer foto para JPEG de verdade, lendo o CONTEÚDO (não o nome nem o tipo declarado):
 * em produção chegou um arquivo `.jpg` / `image/jpeg` que por dentro era HEIF, e o modelo de imagem
 * recusou. Usa o sharp (JPEG, PNG, WEBP, AVIF/HEIF-AV1…) e, se ele não decodificar (HEIC/HEVC do
 * iPhone), o heic-convert. Corrige a orientação da câmera. Recebe: bytes. Devolve: JPEG.
 */
export async function toJpeg(bytes: Uint8Array): Promise<Buffer> {
  try {
    return await sharp(Buffer.from(bytes)).rotate().jpeg({ quality: 90 }).toBuffer();
  } catch {
    const out = await convertHeic({ buffer: Buffer.from(bytes) as unknown as ArrayBuffer, format: "JPEG", quality: 0.9 });
    return Buffer.from(out as ArrayBuffer);
  }
}

/**
 * Bug B-9: a ficha tem 3 painéis iguais lado a lado (prompt ficha.v2: frente, costas, close da marca).
 * O close da gola por dentro faz o Grok barrar a cena por conteúdo; a nova tentativa pós-nsfw usa só
 * frente e costas. Recebe: imagem da ficha. Devolve: JPEG com os 2/3 da esquerda.
 */
export async function dropCloseUpPanel(sheet: Uint8Array): Promise<Buffer> {
  const image = sharp(sheet);
  const { width = 0, height = 0 } = await image.metadata();
  return image.extract({ left: 0, top: 0, width: Math.round((width * 2) / 3), height }).jpeg({ quality: 92 }).toBuffer();
}
