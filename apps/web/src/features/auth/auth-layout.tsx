import Image from "next/image";
import type { ReactNode } from "react";
import { APP_NAME, MADE_BY } from "@/lib/constants";
import { fill } from "@/lib/copy";

/** Marca do AdFit: ícone + nome grande (pedido do Alexandre: o nome estava menor que "Entrar"). */
export function BrandMark({ size = "lg" }: { size?: "lg" | "md" }) {
  const big = size === "lg";
  return (
    <div className="flex items-center gap-3">
      <Image src="/brand/adfit-logo-192.png" alt="" width={big ? 48 : 36} height={big ? 48 : 36} className="rounded-[12px]" priority />
      <span className={big ? "text-[34px] font-extrabold leading-none tracking-tight" : "text-[24px] font-extrabold leading-none tracking-tight"}>{APP_NAME}</span>
    </div>
  );
}

/**
 * Moldura das telas públicas (seção 16.3): foto editorial no topo (celular) ou metade esquerda
 * (desktop), a marca do AdFit em destaque, título, conteúdo e o crédito da Dab Lab (MD-2).
 * Recebe: título, subtítulo, texto "Feito pela {estudio}" no idioma, conteúdo e se mostra a foto.
 */
export function AuthLayout({ title, subtitle, madeBy, children, image = true }: { title: string; subtitle?: ReactNode; madeBy: string; children: ReactNode; image?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {image && (
        <div className="relative h-[30dvh] w-full md:h-auto md:w-1/2">
          <Image src="/images/entrar.jpg" alt="" fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover object-[50%_30%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0 md:bg-none" />
        </div>
      )}
      <div className="flex flex-1 items-start justify-center px-5 py-8 md:items-center md:px-12">
        <div className="flex w-full max-w-md flex-col gap-7">
          <BrandMark />
          <div>
            <h1 className="text-[30px] font-bold leading-[1.15] tracking-tight md:text-[34px]">{title}</h1>
            {subtitle && <p className="mt-3 text-[17px] leading-relaxed text-text-2">{subtitle}</p>}
          </div>
          {children}
          <p className="pt-2 text-center text-[12px] text-text-2">{fill(madeBy, { estudio: MADE_BY })}</p>
        </div>
      </div>
    </div>
  );
}
