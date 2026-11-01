import "server-only";
import { createAdminClient } from "../db/supabase";
import { brandObject } from "../storage";
import { toJpeg } from "../images";
import type { GenerationClient } from "./types";

/**
 * URLs de entrada para a Higgsfield (seção 4.3; divergência D-17 ampliada em 01/11/2026). Cada imagem
 * (foto original, ficha ou quadro) é baixada do Storage, convertida para JPEG pelo CONTEÚDO (`toJpeg`)
 * e enviada pela API de upload da Higgsfield. Motivo: em produção, uma foto `.jpg` que por dentro era
 * HEIF foi recusada pelo modelo — a URL assinada entregava o arquivo original sem conversão.
 * Só aceita caminhos da pasta da marca (`produtos/<marca>/…` ou `anuncios/<marca>/…`): a service_role
 * ignora as políticas. Recebe: marca, caminhos completos e o cliente. Devolve: URLs públicas, na ordem.
 */
export async function referenceUrls(marcaId: string, paths: string[], hf: GenerationClient): Promise<string[]> {
  const objects = paths.map((p) => brandObject(marcaId, p));
  const storage = createAdminClient().storage;
  return Promise.all(
    objects.map(async ({ bucket, object }) => {
      const { data, error } = await storage.from(bucket).download(object);
      if (error || !data) throw error ?? new Error("download_falhou");
      const jpeg = await toJpeg(new Uint8Array(await data.arrayBuffer()));
      return hf.uploadInput(new Uint8Array(jpeg), "image/jpeg");
    }),
  );
}
