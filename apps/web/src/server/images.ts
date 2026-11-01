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
