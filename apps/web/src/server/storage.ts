import "server-only";
import sharp from "sharp";
import { toJpeg } from "./images";
import { createAdminClient } from "./db/supabase";
import { objectPath } from "@/lib/storage-paths";
import type { ClaudeImage } from "./claude/types";

/** Buckets que guardam arquivos de uma marca na pasta `<marca_id>/…` (seção 6.4). */
type BrandBucket = "produtos" | "anuncios";

/**
 * Confere que um caminho completo (`<bucket>/<marca>/…`) é da pasta da marca. A service_role ignora
 * as políticas de Storage: todo acesso do servidor passa por aqui (pegadinha do CLAUDE.md).
 * Recebe: marca e caminho. Devolve: { bucket, object } ou lança `caminho_fora_da_marca`.
 */
export function brandObject(marcaId: string, path: string): { bucket: BrandBucket; object: string } {
  const bucket = path.split("/")[0] as BrandBucket;
  if ((bucket !== "produtos" && bucket !== "anuncios") || !path.startsWith(`${bucket}/${marcaId}/`) || path.includes("..")) {
    throw new Error("caminho_fora_da_marca");
  }
  return { bucket, object: objectPath(path, bucket) };
}

/** URLs assinadas de 60 min (seção 6.4) para caminhos da marca, em qualquer bucket da marca. */
export async function signBrandPaths(marcaId: string, paths: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const byBucket = new Map<BrandBucket, string[]>();
  for (const p of paths) {
    try {
      const { bucket } = brandObject(marcaId, p);
      byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), p]);
    } catch {
      // Caminho de outra marca: não assina.
    }
  }
  const storage = createAdminClient().storage;
  for (const [bucket, list] of byBucket) {
    const { data } = await storage.from(bucket).createSignedUrls(list.map((p) => objectPath(p, bucket)), 3600);
    (data ?? []).forEach((d, i) => d.signedUrl && (out[list[i]] = d.signedUrl));
  }
  return out;
}

/**
 * Lê uma imagem da marca e a prepara para o Claude: lado maior até 1568 px e JPEG (o Claude reduz
 * acima disso e a API recusa base64 acima de 5 MB). Recebe: marca e caminho. Devolve: ClaudeImage.
 */
export async function claudeImage(marcaId: string, path: string): Promise<ClaudeImage> {
  const { bucket, object } = brandObject(marcaId, path);
  const { data, error } = await createAdminClient().storage.from(bucket).download(object);
  if (error || !data) throw error ?? new Error("download_falhou");
  const jpeg = await sharp(await toJpeg(new Uint8Array(await data.arrayBuffer())))
    .resize({ width: 1568, height: 1568, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  return { mediaType: "image/jpeg", data: jpeg.toString("base64") };
}
