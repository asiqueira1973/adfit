import { MADE_BY, MADE_BY_URL } from "@/lib/constants";

/**
 * Crédito "Feito pela Dab Lab" (MD-2) com link para dablab.com.br (pedido do Alexandre, 01/11/2026).
 * Recebe: o texto no idioma ("Feito pela {estudio}") e uma classe. Devolve: o crédito.
 */
export function MadeBy({ text, className }: { text: string; className?: string }) {
  const [before, after] = text.split("{estudio}");
  return (
    <span className={className}>
      {before}
      <a href={MADE_BY_URL} target="_blank" rel="noopener" className="font-semibold underline-offset-2 hover:underline">
        {MADE_BY}
      </a>
      {after}
    </span>
  );
}
