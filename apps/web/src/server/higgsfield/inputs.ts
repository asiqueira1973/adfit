import "server-only";
import { createAdminClient } from "../db/supabase";
import { publicServerEnv } from "../env";
import { objectPath, PHOTO_BUCKET } from "@/lib/storage-paths";
import type { GenerationClient } from "./types";

/**
 * URLs de entrada para a Higgsfield (seção 4.3). Com Storage público na internet (https), usa URL
 * assinada de 60 min; no ambiente local (http://127.0.0.1), a Higgsfield não alcança o Storage e o
 * arquivo sobe pela API de upload da Higgsfield (reserva da seção 23; divergência D-17).
 * Só aceita caminhos da pasta da marca (`produtos/<marca>/…`): a service_role ignora as políticas.
 * Recebe: marca, caminhos completos e o cliente. Devolve: URLs públicas, na mesma ordem.
 */
export async function referenceUrls(marcaId: string, paths: string[], hf: GenerationClient): Promise<string[]> {
  const safe = paths.filter((p) => p.startsWith(`${PHOTO_BUCKET}/${marcaId}/`) && !p.includes(".."));
  if (safe.length !== paths.length) throw new Error("caminho_fora_da_marca");
  const storage = createAdminClient().storage.from(PHOTO_BUCKET);

  if (publicServerEnv().NEXT_PUBLIC_SUPABASE_URL.startsWith("https://")) {
    const { data, error } = await storage.createSignedUrls(safe.map((p) => objectPath(p)), 3600);
    if (error || !data) throw error ?? new Error("assinatura_falhou");
    return data.map((d) => {
      if (!d.signedUrl) throw new Error("assinatura_falhou");
      return d.signedUrl;
    });
  }

  return Promise.all(
    safe.map(async (p) => {
      const { data, error } = await storage.download(objectPath(p));
      if (error || !data) throw error ?? new Error("download_falhou");
      return hf.uploadInput(new Uint8Array(await data.arrayBuffer()), data.type || "image/jpeg");
    }),
  );
}
