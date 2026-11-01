"use client";

import Image from "next/image";
import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Banner, ProgressBar } from "@/components/ui/feedback";
import { SelectField, TextArea, TextField } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { COPY } from "@/lib/copy";
import { CATEGORIA_LABEL, GENERO_ALVO_LABEL } from "@/lib/labels";

/**
 * Formulário [Marca] Novo produto (seção 10 e critério 8.3): nome, categoria, gênero, descrição
 * e 1 a 4 fotos com progresso. Fase de design: `initialState` mostra os estados enviando/erro;
 * o upload real ao Storage (com conversão HEIC→JPG) entra no épico 8.3.
 * Recebe: estado inicial de design. Devolve: o formulário.
 */
export function NewProductForm({ initialState }: { initialState?: string }) {
  const [genero, setGenero] = useState("feminino");
  const photos = initialState === "vazio" ? [] : ["/fixtures/foto-produto.jpg", "/images/vazio-produtos.jpg"];
  const uploading = initialState === "enviando";
  const error = initialState === "erro";

  return (
    <form className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-semibold">Fotos da peça</h2>
          <span className="tabular text-[13px] text-text-2">{photos.length + (uploading ? 1 : 0)}/4</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {photos.map((src) => (
            <div key={src} className="relative aspect-square overflow-hidden rounded-[10px] bg-surface">
              <Image src={src} alt="Foto da peça" fill sizes="96px" className="object-cover" />
              <button type="button" aria-label="Remover foto" className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white">
                <X className="size-4" />
              </button>
            </div>
          ))}
          {uploading && (
            <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-[10px] bg-surface px-2">
              <span className="text-[12px] text-text-2">Enviando…</span>
              <ProgressBar value={62} />
            </div>
          )}
          {photos.length + (uploading ? 1 : 0) < 4 && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-text-2/40 text-text-2 hover:bg-surface">
              <ImagePlus className="size-6" />
              <span className="text-[12px] font-medium">Adicionar</span>
              <input type="file" accept="image/jpeg,image/png,image/heic,image/webp" className="sr-only" multiple />
            </label>
          )}
        </div>
        {error ? <Banner tone="danger">{COPY.uploadErroFormato}</Banner> : <p className="text-[13px] text-text-2">{COPY.uploadAvisoPessoa} JPG, PNG, HEIC ou WEBP até 10 MB.</p>}
      </section>

      <section className="flex flex-col gap-4">
        <TextField label="Nome" name="nome" placeholder="Ex.: Top Kore Preto" defaultValue={initialState === "vazio" ? "" : "Top Kore Preto"} required />
        <SelectField label="Categoria" name="categoria" defaultValue="top" options={Object.entries(CATEGORIA_LABEL).map(([value, label]) => ({ value, label }))} />
        <Segmented name="genero_alvo" label="Para quem é" value={genero} onChange={setGenero} options={Object.entries(GENERO_ALVO_LABEL).map(([value, label]) => ({ value, label }))} />
        <TextArea label="Descrição (opcional)" name="descricao" rows={3} placeholder="Tecido, sustentação, diferenciais…" />
      </section>

      <Button type="submit" disabled={uploading || photos.length === 0}>Salvar produto</Button>
    </form>
  );
}
