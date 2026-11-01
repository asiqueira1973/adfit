/**
 * Flags da fase de design lidas da URL, para capturar cada estado das telas:
 * `?estado=` (estado da tela), `?saldo=` (sobrepõe o saldo) e `?pausada=1` (marca pausada, seção 6.3).
 * Recebe: os searchParams resolvidos. Devolve: os valores normalizados.
 */
import { fxBrand } from ".";

export type DesignFlags = { estado?: string; saldo: number; pausada: boolean; formato?: string };

export function readFlags(sp: Record<string, string | string[] | undefined>): DesignFlags {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : sp[k]) as string | undefined;
  const saldo = one("saldo");
  return {
    estado: one("estado"),
    saldo: saldo !== undefined && !Number.isNaN(Number(saldo)) ? Number(saldo) : fxBrand.saldo_creditos,
    pausada: one("pausada") === "1",
    formato: one("formato"),
  };
}
