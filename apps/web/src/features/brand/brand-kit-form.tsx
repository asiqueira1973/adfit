"use client";

import Image from "next/image";
import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { fxBrand } from "@/features/fixtures";

/**
 * Prévia ao vivo do fecho do vídeo (seção 10 e regra 11.8): clipe escurecido 40%, logo
 * centralizado (largura 40% no vertical) ou o nome da marca sem logo, CTA na cor de destaque
 * (branco se nula) e oferta abaixo. Recebe: dados do kit. Devolve: a prévia 9:16.
 */
export function ClosingPreview({ name, logo, color, cta, offer }: { name: string; logo: string | null; color: string; cta: string; offer?: string }) {
  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[14px] bg-black">
      <Image src="/fixtures/cena-3.jpg" alt="" fill sizes="220px" className="object-cover" />
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-x-[6%] top-[15%] bottom-[30%] flex flex-col items-center justify-center gap-[6%] text-center">
        {logo ? (
          <div className="relative aspect-[3/1] w-[40%]"><Image src={logo} alt="Logo" fill className="object-contain" /></div>
        ) : (
          <span className="text-[clamp(16px,6cqw,28px)] font-bold text-white drop-shadow">{name}</span>
        )}
        <span className="text-[13px] font-bold leading-tight drop-shadow" style={{ color: /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#FFFFFF" }}>{cta}</span>
        {offer && <span className="text-[11px] font-semibold text-white drop-shadow">{offer}</span>}
      </div>
    </div>
  );
}

/**
 * Formulário [Marca] Marca (seção 10 e épico 8.3): logo (PNG/SVG/JPG até 5 MB), nome, @, cor de
 * destaque, CTA (40) e tom de voz, com prévia ao vivo. Fase de design: não salva.
 */
export function BrandKitForm() {
  const [name, setName] = useState(fxBrand.nome);
  const [color, setColor] = useState(fxBrand.cor_destaque);
  const [cta, setCta] = useState(fxBrand.cta_padrao);
  return (
    <div className="grid gap-8 md:grid-cols-[1fr_240px]">
      <form className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="flex size-20 items-center justify-center rounded-[14px] border border-dashed border-text-2/40 bg-surface text-[12px] text-text-2">Sem logo</div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] bg-surface px-4 text-[15px] font-semibold">
            <Upload className="size-4" /> Enviar logo
            <input type="file" accept="image/png,image/svg+xml,image/jpeg" className="sr-only" />
          </label>
        </div>
        <p className="-mt-3 text-[13px] text-text-2">PNG, SVG ou JPG até 5 MB. Fundo transparente fica melhor.</p>
        <TextField label="Nome da marca" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Instagram" defaultValue={fxBrand.instagram} hint="Sem o @." />
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-text-2">Cor de destaque</span>
          <div className="flex items-center gap-3">
            <input type="color" aria-label="Escolher cor" value={color} onChange={(e) => setColor(e.target.value.toUpperCase())} className="size-11 cursor-pointer rounded-[10px] border border-hairline bg-transparent p-1" />
            <input aria-label="Cor em hexadecimal" value={color} onChange={(e) => setColor(e.target.value)} className="w-32 rounded-[10px] border border-hairline bg-bg px-3 py-2.5 font-mono text-[15px]" />
          </div>
        </div>
        <TextField label="Chamada final (CTA)" maxChars={40} value={cta} onChange={(e) => setCta(e.target.value)} />
        <TextField label="Tom de voz (opcional)" defaultValue={fxBrand.tom_de_voz} hint="Como os textos do vídeo devem soar." />
        <Button type="submit">Salvar</Button>
      </form>
      <div className="flex flex-col gap-2 md:sticky md:top-20 md:self-start">
        <span className="text-[13px] font-medium text-text-2">Fim do vídeo</span>
        <div className="mx-auto w-[220px] md:w-full"><ClosingPreview name={name} logo={fxBrand.logo} color={color} cta={cta} offer="20% OFF esta semana" /></div>
      </div>
    </div>
  );
}
