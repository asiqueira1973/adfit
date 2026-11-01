"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Banner, ProgressBar } from "@/components/ui/feedback";
import { MAX_PHOTOS, validatePhoto } from "@/lib/photo-rules";
import type { Dictionary } from "@/lib/i18n";
import { deleteProductPhoto, uploadProductPhoto } from "./photo-upload";

type Photo = { id: string; storage_path: string; ordem: number; url: string | null };

/**
 * Fotos originais na tela [Marca] Produto (seção 10): mostra, adiciona (até 4, critério 8.3) e
 * remove enquanto o produto não tem ficha aprovada (seção 7.4). Com ficha aprovada, só mostra.
 * Recebe: marca, produto, fotos com URL assinada, se pode editar e textos.
 */
export function PhotoManager({ marcaId, produtoId, photos, editable, t }: { marcaId: string; produtoId: string; photos: Photo[]; editable: boolean; t: Dictionary }) {
  const router = useRouter();
  const [busy, setBusy] = useState<{ pct: number; converting: boolean } | null>(null);
  const [error, setError] = useState<string>();

  async function add(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(undefined);
    if (validatePhoto(file)) return setError(t.copy.uploadErroFormato);
    const ordem = [1, 2, 3, 4].find((n) => !photos.some((p) => p.ordem === n)) ?? photos.length + 1;
    setBusy({ pct: 0, converting: false });
    try {
      await uploadProductPhoto(marcaId, produtoId, file, ordem, (pct, phase) => setBusy({ pct, converting: phase === "convertendo" }));
      router.refresh();
    } catch {
      setError(t.copy.uploadErroFormato);
    } finally {
      setBusy(null);
    }
  }

  async function remove(p: Photo) {
    setError(undefined);
    try {
      await deleteProductPhoto(p.id, p.storage_path);
      router.refresh();
    } catch {
      setError(t.erros.generico);
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-text-2">{t.produtos.fotosOriginais}</h2>
      <div className="grid grid-cols-4 gap-2 md:max-w-md">
        {photos.map((p) => (
          <div key={p.id} className="relative aspect-square overflow-hidden rounded-[10px] bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage */}
            {p.url && <img src={p.url} alt={t.produtos.fotosPeca} className="size-full object-cover" />}
            {editable && photos.length > 1 && !busy && (
              <button type="button" aria-label={t.produtos.removerFoto} onClick={() => remove(p)} className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white">
                <X className="size-4" />
              </button>
            )}
          </div>
        ))}
        {busy && (
          <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-[10px] bg-surface px-2 text-[12px] text-text-2">
            {busy.converting ? t.produtos.convertendo : `${t.produtos.enviando} ${busy.pct}%`}
            <ProgressBar value={busy.pct} />
          </div>
        )}
        {editable && !busy && photos.length < MAX_PHOTOS && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-text-2/40 text-text-2 hover:bg-surface">
            <ImagePlus className="size-6" />
            <span className="text-[12px] font-medium">{t.produtos.adicionar}</span>
            <input type="file" accept="image/jpeg,image/png,image/heic,image/heif,image/webp,.heic,.heif" className="sr-only" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
          </label>
        )}
      </div>
      {error && <Banner tone="danger">{error}</Banner>}
    </section>
  );
}
