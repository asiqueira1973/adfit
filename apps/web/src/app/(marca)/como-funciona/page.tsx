import { Suspense } from "react";
import { Lightbulb } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/feedback";
import { brandContext } from "@/server/brand/context";

/**
 * Tela "Como funciona o AdFit" (pedido do Alexandre, 01/11/2026): passo a passo em linguagem simples
 * para quem não é da área de tecnologia, em pt-BR e inglês (MD-1). Fica no menu do perfil.
 */
export default function HowItWorksPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-xl animate-pulse rounded-[14px] bg-surface" />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const { t } = await brandContext();
  const c = t.comoFunciona;
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PageHeader title={c.titulo} />
      <p className="text-[17px] leading-relaxed">{c.intro}</p>

      <ol className="flex flex-col gap-3">
        {c.passos.map((p, i) => (
          <li key={p.titulo}>
            <Card className="flex gap-4 p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-pill text-[15px] font-bold text-brand-text">{i + 1}</span>
              <div className="flex flex-col gap-1">
                <h2 className="text-[17px] font-semibold">{p.titulo}</h2>
                <p className="text-[15px] leading-relaxed text-text-2">{p.texto}</p>
              </div>
            </Card>
          </li>
        ))}
      </ol>

      <section className="flex flex-col gap-2">
        <h2 className="text-[20px] font-bold tracking-tight">{c.creditosTitulo}</h2>
        <p className="text-[15px] leading-relaxed text-text-2">{c.creditosTexto}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[20px] font-bold tracking-tight">{c.dicasTitulo}</h2>
        <ul className="flex flex-col gap-2">
          {c.dicas.map((d) => (
            <li key={d} className="flex gap-3 text-[15px] leading-relaxed text-text-2">
              <Lightbulb className="mt-0.5 size-4.5 shrink-0 text-brand-text" /> {d}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[15px] text-text-2">{c.duvidas}</p>
      <ButtonLink href="/produtos/novo">{c.comecar}</ButtonLink>
    </div>
  );
}
