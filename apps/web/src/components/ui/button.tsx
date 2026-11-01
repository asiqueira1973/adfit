"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";
import { COPY } from "@/lib/copy";
import { costSuffix } from "@/lib/format";
import { useBrandStatus } from "@/features/shell/brand-status";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-4 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-processing";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-brand-ink hover:brightness-95 disabled:bg-surface disabled:text-text-2",
  secondary: "bg-surface text-text hover:brightness-[0.97] disabled:text-text-2",
  ghost: "text-text hover:bg-surface disabled:text-text-2",
  danger: "bg-surface text-danger hover:brightness-[0.97]",
};

/** Classes de botão, para usar também em <Link>. */
export function buttonClass(variant: Variant = "primary", extra?: string): string {
  return cn(base, variants[variant], extra);
}

/**
 * Botão base com as variantes da seção 16.2 (raio 10 px, alvo ≥ 44 px).
 * Recebe: props de <button> e `variant`. Devolve: o elemento.
 */
export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

/** Link com aparência de botão. */
export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

/**
 * Botão de ação cobrada (princípio 4 e seção 9.2.6): mostra o custo no rótulo
 * ("Gerar vídeo · 12 créditos" / "· grátis"); sem saldo fica desabilitado com
 * "Saldo insuficiente" e link "Comprar créditos"; com a marca pausada fica desabilitado.
 * Dentro das telas da marca, saldo e pausa vêm do banco (BrandStatusProvider na casca) e têm
 * prioridade sobre as props; as props valem fora desse contexto.
 * Recebe: rótulo, custo, saldo atual, se a marca está pausada e props de botão.
 * Devolve: o botão (e o link de compra quando falta saldo).
 */
export function CostButton({
  label,
  cost,
  balance,
  paused = false,
  variant = "primary",
  className,
  icon,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  label: string;
  cost: number;
  balance: number;
  paused?: boolean;
  variant?: Variant;
  icon?: ReactNode;
}) {
  const status = useBrandStatus();
  const effectiveBalance = status?.balance ?? balance;
  const effectivePaused = status?.paused ?? paused;
  const insufficient = effectiveBalance < cost;
  const disabled = props.disabled || effectivePaused || insufficient;
  return (
    <div className={cn("flex flex-col items-stretch gap-1.5", className)}>
      <button {...props} disabled={disabled} className={buttonClass(variant, "w-full")}>
        {icon}
        {insufficient ? (status?.labels.saldoInsuficiente ?? COPY.saldoInsuficiente) : `${label} · ${costSuffix(cost, status?.labels)}`}
      </button>
      {insufficient && !effectivePaused && (
        <Link href="/creditos/comprar" className="text-center text-[13px] font-medium text-brand-text underline-offset-2 hover:underline">
          {status?.labels.comprarCreditos ?? "Comprar créditos"}
        </Link>
      )}
    </div>
  );
}
