import "server-only";
import { createAdminClient } from "../db/supabase";
import { objectPath, PHOTO_BUCKET } from "@/lib/storage-paths";
import { toJpeg } from "../images";
import type { GenerationClient } from "./types";

/**
 * URLs de entrada para a Higgsfield (seção 4.3; divergência D-17 ampliada em 01/11/2026). Cada foto é
 * baixada do Storage, convertida para JPEG pelo CONTEÚDO (`toJpeg`) e enviada pela API de upload da
 * Higgsfield. Motivo: em produção, uma foto `.jpg` que por dentro era HEIF foi recusada pelo modelo
 * ("media format is not supported") — a URL assinada entregava o arquivo original sem conversão.
 * Só aceita caminhos da pasta da marca (`produtos/<marca>/…`): a service_role ignora as políticas.
 * Recebe: marca, caminhos completos e o cliente. Devolve: URLs públicas, na mesma ordem.
 */
export async function referenceUrls(marcaId: string, paths: string[], hf: GenerationClient): Promise<string[]> {
  const safe = paths.filter((p) => p.startsWith(`${PHOTO_BUCKET}/${marcaId}/`) && !p.includes(".."));
  if (safe.length !== paths.length) throw new Error("caminho_fora_da_marca");
  const storage = createAdminClient().storage.from(PHOTO_BUCKET);
  return Promise.all(
    safe.map(async (p) => {
      const { data, error } = await storage.download(objectPath(p));
      if (error || !data) throw error ?? new Error("download_falhou");
      const jpeg = await toJpeg(new Uint8Array(await data.arrayBuffer()));
      return hf.uploadInput(new Uint8Array(jpeg), "image/jpeg");
    }),
  );
}
