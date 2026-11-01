"use client";

import { createBrowserSupabase } from "./supabase-browser";
import { PUBLIC_ENV } from "./public-env";

/**
 * Envia um arquivo direto ao Storage do Supabase com progresso (critério 8.3: "upload com
 * progresso"). Usa a sessão do usuário: as políticas storage_adfit_* (seção 6.4) decidem se pode.
 * Recebe: bucket, caminho dentro do bucket, arquivo, tipo e callback de progresso (0–100).
 * Devolve: nada; lança erro com o status HTTP se a Storage recusar.
 */
export async function uploadWithProgress(bucket: string, path: string, file: Blob, contentType: string, onProgress: (pct: number) => void): Promise<void> {
  const { data } = await createBrowserSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("sem_sessao");
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${PUBLIC_ENV.supabaseUrl}/storage/v1/object/${bucket}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", PUBLIC_ENV.supabaseAnonKey);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`storage_${xhr.status}`)));
    xhr.onerror = () => reject(new Error("rede"));
    xhr.send(file);
  });
}
