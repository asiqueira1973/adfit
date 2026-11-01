import Image from "next/image";
import type { ReactNode } from "react";
import { APP_NAME, MADE_BY } from "@/lib/constants";
import { COPY, fill } from "@/lib/copy";

/**
 * Moldura das telas públicas (seção 16.3): foto editorial no topo (celular) ou metade
 * esquerda (desktop), formulário ao lado. Recebe: título, subtítulo e o conteúdo.
 */
export function AuthLayout({ title, subtitle, children, image = true }: { title: string; subtitle?: ReactNode; children: ReactNode; image?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {image && (
        <div className="relative h-[38dvh] w-full md:h-auto md:w-1/2">
          <Image src="/images/entrar.jpg" alt="" fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover object-[50%_30%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0 md:bg-gradient-to-r md:from-black/0 md:to-black/0" />
          <span className="absolute bottom-4 left-5 text-[22px] font-bold tracking-tight text-white md:hidden">{APP_NAME}</span>
        </div>
      )}
      <div className="flex flex-1 items-start justify-center px-5 py-8 md:items-center md:px-12">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div>
            <div className="mb-6 hidden text-[17px] font-bold tracking-tight md:block">{APP_NAME}</div>
            <h1 className="text-[28px] font-bold leading-tight tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1.5 text-[15px] text-text-2">{subtitle}</p>}
          </div>
          {children}
          <p className="pt-4 text-center text-[12px] text-text-2">{fill(COPY.feitoPor, { estudio: MADE_BY })}</p>
        </div>
      </div>
    </div>
  );
}
