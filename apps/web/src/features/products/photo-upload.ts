"use client";

import { createBrowserSupabase } from "@/lib/supabase-browser";
import { contentTypeFor, photoExtension } from "@/lib/photo-rules";
import { objectPath, photoStoragePath, PHOTO_BUCKET } from "@/lib/storage-paths";
import { uploadWithProgress } from "@/lib/storage-upload";

export type UploadPhase = "enviando" | "convertendo" | "ok";

/**
 * Envia uma foto original de produto (critério 8.3): Storage em
 * `produtos/<marca>/<produto>/originais/<uuid>.<ext>` (política storage_adfit_insert), linha em
 * `fotos_produto` (RLS fotos_insert; o trigger trg_fotos_produto_limite barra a 5ª) e, se for
 * HEIC, pede a conversão para JPG ao servidor (D-14).
 * Recebe: marca, produto, arquivo, ordem (1–4) e callback de progresso/fase. Devolve: id da foto.
 */
export async function uploadProductPhoto(
  marcaId: string,
  produtoId: string,
  file: File,
  ordem: number,
  onProgress: (pct: number, phase: UploadPhase) => void,
): Promise<string> {
  const ext = photoExtension(file.type, file.name);
  if (!ext) throw new Error("formato");
  const storagePath = photoStoragePath(marcaId, produtoId, `${crypto.randomUUID()}.${ext}`);
  await uploadWithProgress(PHOTO_BUCKET, objectPath(storagePath), file, contentTypeFor(ext), (pct) => onProgress(pct, "enviando"));

  const supabase = createBrowserSupabase();
  const { data, error } = await supabase.from("fotos_produto").insert({ produto_id: produtoId, marca_id: marcaId, storage_path: storagePath, ordem }).select("id").single();
  if (error) {
    await supabase.storage.from(PHOTO_BUCKET).remove([objectPath(storagePath)]);
    throw new Error(error.message);
  }
  if (ext === "heic") {
    onProgress(100, "convertendo");
    const res = await fetch(`/api/fotos/${data.id}/converter`, { method: "POST" });
    if (!res.ok) throw new Error("conversao");
  }
  onProgress(100, "ok");
  return data.id;
}

/**
 * Remove uma foto original enquanto o produto não tem ficha aprovada (RLS fotos_delete; seção 7.4:
 * hard delete permitido só nesse caso). Recebe: id e caminho completo. Devolve: nada.
 */
export async function deleteProductPhoto(fotoId: string, storagePath: string): Promise<void> {
  const supabase = createBrowserSupabase();
  const { error } = await supabase.from("fotos_produto").delete().eq("id", fotoId);
  if (error) throw new Error(error.message);
  await supabase.storage.from(PHOTO_BUCKET).remove([objectPath(storagePath)]);
}
