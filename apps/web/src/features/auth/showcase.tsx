import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";

/**
 * Vitrine do fluxo na tela Entrar (pedido do Alexandre, 01/11/2026): imagens REAIS geradas pelo
 * próprio AdFit (foto da peça → ficha → 3 cenas com a mesma modelo) e os argumentos de venda.
 * Recebe: textos. Devolve: o painel (escuro, metade esquerda no desktop; abaixo do login no celular).
 */
export function Showcase({ t }: { t: Dictionary["vitrine"] }) {
  return (
    <div className="flex h-full flex-col justify-center gap-7 bg-[#111113] px-6 py-10 text-white md:px-12">
      <h2 className="text-[26px] font-bold leading-tight tracking-tight md:text-[30px]">{t.titulo}</h2>

      <div className="flex items-center gap-3">
        <figure className="flex flex-col gap-1.5">
          <div className="relative aspect-[3/4] w-20 overflow-hidden rounded-[10px] md:w-24">
            <Image src="/images/landing/foto.jpg" alt="" fill sizes="96px" className="object-cover" />
          </div>
          <figcaption className="text-[12px] text-white/70">{t.foto}</figcaption>
        </figure>
        <ArrowRight className="size-5 shrink-0 text-[#c6f432]" aria-hidden />
        <figure className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[10px] bg-[#EDEDED]">
            <Image src="/images/landing/ficha.jpg" alt="" fill sizes="(max-width: 768px) 60vw, 360px" className="object-contain" />
          </div>
          <figcaption className="text-[12px] text-white/70">{t.ficha}</figcaption>
        </figure>
      </div>

      <figure className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="relative aspect-[9/16] overflow-hidden rounded-[10px]">
              <Image src={`/images/landing/cena-${n}.jpg`} alt="" fill sizes="(max-width: 768px) 30vw, 180px" className="object-cover" />
              <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold">{n}</span>
            </div>
          ))}
        </div>
        <figcaption className="text-[12px] text-white/70">
          {t.cenas} · <span className="text-[#c6f432]">{t.mesmaModelo}</span>
        </figcaption>
      </figure>

      <ul className="grid gap-2.5 sm:grid-cols-2">
        {t.argumentos.map((a) => (
          <li key={a} className="flex gap-2 text-[14px] leading-snug text-white/90">
            <Check className="mt-0.5 size-4 shrink-0 text-[#c6f432]" strokeWidth={3} aria-hidden /> {a}
          </li>
        ))}
      </ul>
    </div>
  );
}
