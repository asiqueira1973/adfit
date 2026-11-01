"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Saldo e situação da marca do usuário logado, para os botões cobrados (princípio 4, seção 6.3). */
export type BrandStatus = { balance: number; paused: boolean };

const BrandStatusContext = createContext<BrandStatus | null>(null);

/**
 * Provedor do saldo/pausa da marca, montado na casca da marca com os dados do banco.
 * Recebe: o status e os filhos. Devolve: o provedor.
 */
export function BrandStatusProvider({ value, children }: { value: BrandStatus; children: ReactNode }) {
  return <BrandStatusContext value={value}>{children}</BrandStatusContext>;
}

/** Lê o status da marca; null fora das telas da marca (ex.: admin). */
export function useBrandStatus(): BrandStatus | null {
  return useContext(BrandStatusContext);
}
