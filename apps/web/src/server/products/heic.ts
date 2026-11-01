import "server-only";
import convert from "heic-convert";
import { createAdminClient } from "../db/supabase";
import { BusinessError } from "../api/http";
import type { Profile } from "../auth/profile";
import { objectPath, PHOTO_BUCKET } from "@/lib/storage-paths";

/**
 * Converte uma foto HEIC já enviada ao Storage em JPG (critério 8.3: "HEIC convertido para JPG no
 * servidor"; divergência D-14 — a foto não passa pelo servidor no envio por causa do limite de
 * 4,5 MB da Vercel). Recebe: id da foto, quem pede e (testes) o conversor.
 * Valida: a foto é da marca de quem pede (ou admin) e o caminho termina em .heic.
 * Faz: baixa o original, converte (qualidade 0,9), grava `<mesmo nome>.jpg`, atualiza
 *   `fotos_produto.storage_path` e apaga o .heic. Idempotente: foto já em .jpg não muda.
 * Devolve: o novo caminho.
 */
export async function convertHeicPhoto(
  fotoId: string,
  actor: Pick<Profile, "papel" | "marcaId">,
  converter: (input: { buffer: Buffer; format: "JPEG"; quality: number }) => Promise<ArrayBuffer> = convert,
): Promise<string> {
  const db = createAdminClient();
  const { data: foto } = await db.from("fotos_produto").select("id, marca_id, storage_path").eq("id", fotoId).maybeSingle();
  if (!foto || (actor.papel !== "admin_plataforma" && foto.marca_id !== actor.marcaId)) throw new BusinessError("foto_inexistente");
  if (!/\.heic$/i.test(foto.storage_path)) return foto.storage_path;

  const bucket = db.storage.from(PHOTO_BUCKET);
  const { data: blob, error: downErr } = await bucket.download(objectPath(foto.storage_path));
  if (downErr || !blob) throw downErr ?? new Error("download vazio");
  const jpg = Buffer.from(await converter({ buffer: Buffer.from(await blob.arrayBuffer()), format: "JPEG", quality: 0.9 }));

  const newPath = foto.storage_path.replace(/\.heic$/i, ".jpg");
  const { error: upErr } = await bucket.upload(objectPath(newPath), jpg, { contentType: "image/jpeg", upsert: true });
  if (upErr) throw upErr;
  const { error: rowErr } = await db.from("fotos_produto").update({ storage_path: newPath }).eq("id", foto.id);
  if (rowErr) throw rowErr;
  await bucket.remove([objectPath(foto.storage_path)]);
  return newPath;
}
