import "server-only";
import { createAdminClient } from "../db/supabase";
import { brandObject } from "../storage";
import { dropCloseUpPanel, toJpeg } from "../images";
import type { GenerationClient } from "./types";

/**
 * URLs de entrada para a Higgsfield (seção 4.3; divergência D-17 ampliada em 01/11/2026). Cada imagem
 * (foto original, ficha ou quadro) é baixada do Storage, convertida para JPEG pelo CONTEÚDO (`toJpeg`)
 * e enviada pela API de upload da Higgsfield. Motivo: em produção, uma foto `.jpg` que por dentro era
 * HEIF foi recusada pelo modelo — a URL assinada entregava o arquivo original sem conversão.
 * Só aceita caminhos da pasta da marca (`produtos/<marca>/…` ou `anuncios/<marca>/…`): a service_role
 * ignora as políticas. Com `dropCloseUp`, a ficha vai sem o painel do close (bug B-9).
 * Recebe: marca, caminhos completos, o cliente e opções. Devolve: URLs públicas, na ordem.
 */
export async function referenceUrls(marcaId: string, paths: string[], hf: GenerationClient, options: { dropCloseUp?: boolean } = {}): Promise<string[]> {
  const objects = paths.map((p) => brandObject(marcaId, p));
  const storage = createAdminClient().storage;
  return Promise.all(
    objects.map(async ({ bucket, object }) => {
      const { data, error } = await storage.from(bucket).download(object);
      if (error || !data) throw error ?? new Error("download_falhou");
      let jpeg = await toJpeg(new Uint8Array(await data.arrayBuffer()));
      // Só a ficha da PEÇA tem o painel do close (a de personagem tem 4 painéis de pessoa).
      if (options.dropCloseUp && object.includes("/fichas/") && !object.includes("/personagens/")) jpeg = await dropCloseUpPanel(jpeg);
      return hf.uploadInput(new Uint8Array(jpeg), "image/jpeg");
    }),
  );
}
