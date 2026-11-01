"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { getDictionary } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";
import { TextField } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import type { Dictionary } from "@/lib/i18n";
import { brandKitSchema } from "@/lib/schemas/brand";

/**
 * Prévia ao vivo do fecho do vídeo (seção 10 e regra 11.8): clipe escurecido 40%, logo
 * centralizado (40% da largura no vertical) ou o nome da marca sem logo, CTA na cor de destaque
 * (branco se nula) e oferta abaixo. Recebe: dados do kit. Devolve: a prévia 9:16.
 */
export function ClosingPreview({ name, logoUrl, color, cta, offer, logoAlt }: { name: string; logoUrl: string | null; color: string; cta: string; offer?: string; logoAlt: string }) {
  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[14px] bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element -- imagem ilustrativa de fundo */}
      <img src="/fixtures/cena-3.jpg" alt="" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-x-[6%] bottom-[30%] top-[15%] flex flex-col items-center justify-center gap-[6%] text-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage
          <img src={logoUrl} alt={logoAlt} className="max-h-[20%] w-[40%] object-contain" />
        ) : (
          <span className="text-[22px] font-bold text-white drop-shadow">{name}</span>
        )}
        {cta.trim() && <span className="text-[13px] font-bold leading-tight drop-shadow" style={{ color: /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#FFFFFF" }}>{cta}</span>}
        {offer && <span className="text-[11px] font-semibold text-white drop-shadow">{offer}</span>}
      </div>
    </div>
  );
}

export type BrandKit = { id: string; nome: string; instagram: string | null; cor_destaque: string | null; cta_padrao: string | null; tom_de_voz: string | null; idioma_anuncios: "pt_br" | "en" };

/**
 * Formulário [Marca] Marca (seção 10, épico 8.3): nome, @, cor de destaque, CTA (40), tom de voz
 * e idioma do texto dos vídeos (MD-1), com prévia ao vivo. Grava direto em `marcas` pela política
 * marcas_update_kit (seção 6.4); valida com o mesmo schema do admin. O logo é enviado à parte.
 * Recebe: kit atual, URL do logo e textos.
 */
export function BrandKitForm({ kit, logoUrl, t }: { kit: BrandKit; logoUrl: string | null; t: Dictionary }) {
  const router = useRouter();
  const [name, setName] = useState(kit.nome);
  const [color, setColor] = useState(kit.cor_destaque ?? "#FFFFFF");
  const [cta, setCta] = useState(kit.cta_padrao ?? "");
  const [idioma, setIdioma] = useState(kit.idioma_anuncios);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string }>();
  const [pending, start] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = brandKitSchema.safeParse({
      nome: name,
      instagram: String(f.get("instagram") ?? ""),
      cor_destaque: color,
      cta_padrao: cta,
      tom_de_voz: String(f.get("tom_de_voz") ?? ""),
      idioma_anuncios: idioma,
    });
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      return setMsg({ tone: "danger", text: field === "instagram" ? t.erros.instagramInvalido : field === "cor_destaque" ? t.erros.corInvalida : t.erros.validacao });
    }
    start(async () => {
      const { error } = await createBrowserSupabase().from("marcas").update(parsed.data).eq("id", kit.id);
      setMsg(error ? { tone: "danger", text: t.erros.generico } : { tone: "success", text: t.marca.salvo });
      if (!error) router.refresh();
    });
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_240px]">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <TextField label={t.marca.nome} value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
        <TextField label={t.marca.instagram} name="instagram" defaultValue={kit.instagram ?? ""} hint={t.marca.instagramDica} maxLength={31} />
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-text-2">{t.marca.cor}</span>
          <div className="flex items-center gap-3">
            <input type="color" aria-label={t.marca.corEscolher} value={/^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#FFFFFF"} onChange={(e) => setColor(e.target.value.toUpperCase())} className="size-11 cursor-pointer rounded-[10px] border border-hairline bg-transparent p-1" />
            <input aria-label={t.marca.corHex} value={color} onChange={(e) => setColor(e.target.value)} maxLength={7} className="w-32 rounded-[10px] border border-hairline bg-bg px-3 py-2.5 font-mono text-[15px]" />
          </div>
        </div>
        <TextField label={t.marca.cta} maxChars={40} value={cta} onChange={(e) => setCta(e.target.value)} hint={idioma === "en" && cta === "Compre pelo link da bio" ? t.marca.sugestaoCtaEn : undefined} />
        <TextField label={t.marca.tom} name="tom_de_voz" defaultValue={kit.tom_de_voz ?? ""} hint={t.marca.tomDica} maxLength={200} />
        <Segmented name="idioma_anuncios" label={t.marca.idiomaVideos} value={idioma} onChange={(v) => setIdioma(v as "pt_br" | "en")} options={[{ value: "pt_br", label: t.idiomas.pt_br }, { value: "en", label: t.idiomas.en }]} />
        {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}
        <Button type="submit" disabled={pending}>{pending ? t.marca.salvando : t.marca.salvar}</Button>
      </form>
      <div className="flex flex-col gap-2 md:sticky md:top-20 md:self-start">
        <span className="text-[13px] font-medium text-text-2">{t.marca.fimDoVideo}</span>
        <div className="mx-auto w-[220px] md:w-full"><ClosingPreview name={name} logoUrl={logoUrl} color={color} cta={cta} offer={getDictionary(idioma).marca.ofertaExemplo} logoAlt={t.admin.kitLogo} /></div>
      </div>
    </div>
  );
}
