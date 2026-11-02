"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { CostButton } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";
import { TextArea, TextField } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { contentTypeFor, MAX_PHOTOS, photoExtension, validatePhoto } from "@/lib/photo-rules";
import { objectPath, PHOTO_BUCKET } from "@/lib/storage-paths";
import { uploadWithProgress } from "@/lib/storage-upload";
import type { Dictionary } from "@/lib/i18n";
import { callApi } from "@/features/admin/api";

type Picked = { key: string; file: File; preview: string };

/**
 * Formulário Nova personagem (MD-17): nome, descrição, gênero, idade e até 4 fotos opcionais.
 * Cria a personagem (POST /api/personagens), envia as fotos direto ao Storage (política
 * pode_gravar_foto_personagem), registra (POST …/fotos) e pede a ficha (POST …/ficha, cobra).
 * Recebe: marca, preço da ficha e textos. Devolve: o formulário; ao terminar abre a personagem.
 */
export function NewCharacterForm({ marcaId, preco, t }: { marcaId: string; preco: number; t: Pick<Dictionary, "personagens" | "opcoes" | "copy" | "erros"> }) {
  const router = useRouter();
  const p = t.personagens;
  const [genero, setGenero] = useState("mulher");
  const [faixa, setFaixa] = useState("de_20_a_30");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

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
      next.push({ key: crypto.randomUUID(), file, preview: URL.createObjectURL(file) });
    }
    setPicked(next);
  }

  async function submit() {
    if (!nome.trim()) return setError(t.erros.validacao);
    setSaving(true);
    setError(undefined);
    const created = await callApi<{ personagem_id: string }>("POST", "/api/personagens", { nome, descricao: descricao.trim() || undefined, genero_modelo: genero, faixa_etaria: faixa });
    if (!created.ok) {
      setSaving(false);
      return setError(created.mensagem || t.erros.generico);
    }
    const id = created.data.personagem_id;
    const paths: string[] = [];
    for (const item of picked) {
      const ext = photoExtension(item.file.type, item.file.name);
      if (!ext) continue;
      const path = `${PHOTO_BUCKET}/${marcaId}/personagens/${id}/originais/${crypto.randomUUID()}.${ext}`;
      try {
        await uploadWithProgress(PHOTO_BUCKET, objectPath(path), item.file, contentTypeFor(ext), () => {});
        paths.push(path);
      } catch {
        /* foto que não subiu: segue sem ela */
      }
    }
    if (paths.length) await callApi("POST", `/api/personagens/${id}/fotos`, { paths });
    const sheet = await callApi("POST", `/api/personagens/${id}/ficha`, {});
    if (!sheet.ok) setError(sheet.mensagem || t.erros.generico);
    // A tela da personagem mostra o andamento da ficha (ou o erro e o botão de tentar de novo).
    router.push(`/personagens/${id}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <Banner tone="danger">{error}</Banner>}
      <TextField label={p.nome} maxChars={60} value={nome} onChange={(e) => setNome(e.target.value)} placeholder={p.nomePlaceholder} required />
      <Segmented name="genero" label={p.genero} value={genero} onChange={setGenero} options={Object.entries(t.opcoes.generosModelo).map(([value, label]) => ({ value, label }))} />
      <Segmented name="faixa" label={p.idade} value={faixa} onChange={setFaixa} options={Object.entries(t.opcoes.faixasEtarias).map(([value, label]) => ({ value, label }))} />
      <TextArea label={p.descricao} rows={3} maxChars={300} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder={p.descricaoPlaceholder} />
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-text-2">{p.fotos}</span>
        <div className="flex flex-wrap gap-2">
          {picked.map((it) => (
            <div key={it.key} className="relative size-24 overflow-hidden rounded-[10px] bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element -- prévia local */}
              <img src={it.preview} alt="" className="size-full object-cover" />
              <button type="button" aria-label="Remover" onClick={() => setPicked((l) => l.filter((x) => x.key !== it.key))} className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white">
                <X className="size-4" />
              </button>
            </div>
          ))}
          {picked.length < MAX_PHOTOS && (
            <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-hairline text-[12px] text-text-2 hover:bg-surface">
              <ImagePlus className="size-5" />
              <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,.heic" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
            </label>
          )}
        </div>
        <span className="text-[12px] text-text-2">{p.fotosDica}</span>
      </div>
      <CostButton label={saving ? p.criando : p.criar} cost={preco} balance={0} disabled={saving || !nome.trim()} onClick={submit} />
    </div>
  );
}
