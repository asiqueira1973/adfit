"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { Banner } from "@/components/ui/feedback";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { callApi } from "@/features/admin/api";

const TYPES: Record<string, string> = { "image/png": "png", "image/svg+xml": "svg", "image/jpeg": "jpg" };
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Envio do logo da marca (kit da marca, seções 3.1.2 e 8.3; critério 8.2 "editar todos os campos
 * do kit"). Valida PNG/SVG/JPG até 5 MB, envia direto ao bucket privado `marcas` em
 * `<marca_id>/logo/` (política storage_adfit_insert) e grava `logo_path` pela rota informada.
 * Recebe: marca, URL assinada atual, rota de gravação e textos. Devolve: prévia + botão.
 */
export function LogoUploader({
  marcaId,
  currentUrl,
  saveUrl,
  labels,
}: {
  marcaId: string;
  currentUrl: string | null;
  /** Rota de admin que grava logo_path; sem ela, grava direto em `marcas` pela RLS (tela Marca). */
  saveUrl?: string;
  labels: { enviar: string; trocar: string; dica: string; erro: string; enviando: string; semLogo: string; erroGenerico: string };
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function onFile(file: File | undefined) {
    if (!file) return;
    const ext = TYPES[file.type];
    if (!ext || file.size > MAX_BYTES) return setError(labels.erro);
    setError(undefined);
    start(async () => {
      const path = `${marcaId}/logo/${Date.now()}.${ext}`;
      const { error: upErr } = await createBrowserSupabase().storage.from("marcas").upload(path, file, { contentType: file.type });
      if (upErr) return setError(labels.erroGenerico);
      if (saveUrl) {
        const r = await callApi("PATCH", saveUrl, { logo_path: path });
        if (!r.ok) return setError(r.mensagem || labels.erroGenerico);
      } else {
        // Usuário da marca: grava pela política marcas_update_kit (seção 6.4).
        const { error } = await createBrowserSupabase().from("marcas").update({ logo_path: path }).eq("id", marcaId);
        if (error) return setError(labels.erroGenerico);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <div className="flex size-20 items-center justify-center overflow-hidden rounded-[14px] border border-dashed border-text-2/40 bg-surface text-[12px] text-text-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage */}
          {currentUrl ? <img src={currentUrl} alt="" className="max-h-full max-w-full object-contain" /> : labels.semLogo}
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] bg-surface px-4 text-[15px] font-semibold">
          <Upload className="size-4" /> {pending ? labels.enviando : currentUrl ? labels.trocar : labels.enviar}
          <input type="file" accept="image/png,image/svg+xml,image/jpeg" className="sr-only" disabled={pending} onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      </div>
      {error ? <Banner tone="danger">{error}</Banner> : <p className="text-[13px] text-text-2">{labels.dica}</p>}
    </div>
  );
}
