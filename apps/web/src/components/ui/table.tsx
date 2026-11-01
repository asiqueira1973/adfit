import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * Tabela simples do admin com hairlines (seção 16.2). No celular rola na horizontal dentro do
 * próprio cartão, sem rolar a página. Recebe: cabeçalhos e linhas. Devolve: a tabela.
 */
export function DataTable({ head, rows, className }: { head: ReactNode[]; rows: ReactNode[][]; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-[14px] border border-hairline", className)}>
      <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
        <thead className="bg-surface text-[12px] font-semibold uppercase tracking-wide text-text-2">
          <tr>{head.map((h, i) => <th key={i} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-surface/60">
              {r.map((c, j) => <td key={j} className="px-4 py-3 align-middle">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
