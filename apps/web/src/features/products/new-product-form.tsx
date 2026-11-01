"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Banner, ProgressBar } from "@/components/ui/feedback";
import { SelectField, TextArea, TextField } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { MAX_PHOTOS, validatePhoto } from "@/lib/photo-rules";
import type { Dictionary } from "@/lib/i18n";
import { uploadProductPhoto, type UploadPhase } from "./photo-upload";

type Picked = { key: string; file: File; preview: string; pct: number; phase: UploadPhase | "fila" | "erro" };

/**
 * Formulário [Marca] Novo produto (seção 10, critério 8.3): nome, categoria, gênero, descrição e
 * 1 a 4 fotos. Valida formato/tamanho ao escolher (copy da seção 15), cria o produto (RLS
 * produtos_insert) e envia as fotos com barra de progresso; ao terminar abre o produto.
 * Recebe: id da marca e textos. Devolve: o formulário.
 */
export function NewProductForm({ marcaId, t }: { marcaId: string; t: Dictionary }) {
  const router = useRouter();
  const [genero, setGenero] = useState("unissex");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState<string>();

  function onFiles(files: FileList | null) {
    if (!files) return;
    setError(undefined);
    const next = [...picked];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_PHOTOS) break;
      if (validatePhoto(file)) {
        setError(t.copy.uploadErroFormato);
        continue;
      }
      next.push({ key: crypto.randomUUID(), file, preview: URL.createObjectURL(file), pct: 0, phase: "fila" });
    }
    setPicked(next);
  }

  const update = (key: string, patch: Partial<Picked>) => setPicked((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!picked.length) return setError(t.produtos.fotoObrigatoria);
    const f = new FormData(e.currentTarget);
    setSaving(true);
    setError(undefined);
    const supabase = createBrowserSupabase();
    const { data: produto, error: insErr } = await supabase
      .from("produtos")
      .insert({ marca_id: marcaId, nome: String(f.get("nome")).trim(), categoria: f.get("categoria") as never, genero_alvo: genero as never, descricao: String(f.get("descricao") ?? "").trim() || null })
      .select("id")
      .single();
    if (insErr || !produto) {
      setSaving(false);
      return setError(t.erros.generico);
    }
    let falhou = false;
    for (const [i, p] of picked.entries()) {
      try {
        await uploadProductPhoto(marcaId, produto.id, p.file, i + 1, (pct, phase) => update(p.key, { pct, phase }));
      } catch {
        falhou = true;
        update(p.key, { phase: "erro" });
      }
    }
    if (falhou) {
      // Mostra o erro e deixa a pessoa ir para o produto, onde pode reenviar a foto.
      setError(t.produtos.fotoFalhou);
      setCreatedId(produto.id);
      setSaving(false);
      return;
    }
    router.push(`/produtos/${produto.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-semibold">{t.produtos.fotosPeca}</h2>
          <span className="tabular text-[13px] text-text-2">{picked.length}/{MAX_PHOTOS}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {picked.map((p) => (
            <div key={p.key} className="relative aspect-square overflow-hidden rounded-[10px] bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) */}
              <img src={p.preview} alt="" className="size-full object-cover" />
              {(p.phase === "enviando" || p.phase === "convertendo") && (
                <div className="absolute inset-x-1.5 bottom-1.5 flex flex-col gap-1 rounded-[6px] bg-black/60 p-1.5 text-[11px] text-white">
                  {p.phase === "convertendo" ? t.produtos.convertendo : `${t.produtos.enviando} ${p.pct}%`}
                  <ProgressBar value={p.pct} />
                </div>
              )}
              {!saving && (
                <button type="button" aria-label={t.produtos.removerFoto} onClick={() => setPicked((l) => l.filter((x) => x.key !== p.key))} className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white">
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
          {picked.length < MAX_PHOTOS && !saving && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-text-2/40 text-text-2 hover:bg-surface">
              <ImagePlus className="size-6" />
              <span className="text-[12px] font-medium">{t.produtos.adicionar}</span>
              <input type="file" accept="image/jpeg,image/png,image/heic,image/heif,image/webp,.heic,.heif" multiple className="sr-only" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
            </label>
          )}
        </div>
        {error ? (
          <Banner tone="danger" action={createdId ? <Link href={`/produtos/${createdId}`} className="shrink-0 font-semibold text-brand-text">{t.produtos.abrirProduto}</Link> : undefined}>{error}</Banner>
        ) : (
          <p className="text-[13px] text-text-2">{t.copy.uploadAvisoPessoa} {t.produtos.formatos}</p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <TextField label={t.produtos.nome} name="nome" placeholder={t.produtos.nomePlaceholder} required maxLength={80} />
        <SelectField label={t.produtos.categoria} name="categoria" defaultValue="top" options={Object.entries(t.categorias).map(([value, label]) => ({ value, label }))} />
        <Segmented name="genero_alvo" label={t.produtos.paraQuem} value={genero} onChange={setGenero} options={Object.entries(t.generosAlvo).map(([value, label]) => ({ value, label }))} />
        <TextArea label={t.produtos.descricao} name="descricao" rows={3} maxLength={500} placeholder={t.produtos.descricaoPlaceholder} />
      </section>

      <Button type="submit" disabled={saving || !!createdId}>{saving ? t.produtos.salvando : t.produtos.salvar}</Button>
    </form>
  );
}
