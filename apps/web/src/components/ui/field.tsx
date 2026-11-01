import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

const inputClass =
  "w-full rounded-[10px] border border-hairline bg-bg px-3 py-2.5 text-[16px] text-text placeholder:text-text-2 focus:border-processing focus:outline-none";

/**
 * Campo com rótulo, dica e contador de caracteres (acessibilidade: label em todo campo, seção 17).
 * Recebe: rótulo, dica, limite, valor atual e props de <input>. Devolve: o campo.
 */
export function TextField({
  label,
  hint,
  maxChars,
  error,
  className,
  ...props
}: ComponentProps<"input"> & { label: string; hint?: ReactNode; maxChars?: number; error?: ReactNode }) {
  const length = String(props.value ?? props.defaultValue ?? "").length;
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="flex items-baseline justify-between text-[13px] font-medium text-text-2">
        {label}
        {maxChars && <span className="tabular">{length}/{maxChars}</span>}
      </span>
      <input className={inputClass} maxLength={maxChars} {...props} />
      {error ? <span className="text-[13px] text-danger">{error}</span> : hint && <span className="text-[13px] text-text-2">{hint}</span>}
    </label>
  );
}

/** Área de texto com rótulo e contador (ex.: texto da tela 2×32, instrução de refação 200). */
export function TextArea({
  label,
  hint,
  maxChars,
  warning,
  className,
  ...props
}: ComponentProps<"textarea"> & { label: string; hint?: ReactNode; maxChars?: number; warning?: ReactNode }) {
  const length = String(props.value ?? props.defaultValue ?? "").length;
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="flex items-baseline justify-between text-[13px] font-medium text-text-2">
        {label}
        {maxChars && <span className="tabular">{length}/{maxChars}</span>}
      </span>
      <textarea className={cn(inputClass, "resize-none")} maxLength={maxChars} {...props} />
      {warning ? <span className="text-[13px] text-warning">{warning}</span> : hint && <span className="text-[13px] text-text-2">{hint}</span>}
    </label>
  );
}

/** Seletor nativo com rótulo. */
export function SelectField({ label, options, className, ...props }: ComponentProps<"select"> & { label: string; options: Array<{ value: string; label: string }> }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[13px] font-medium text-text-2">{label}</span>
      <select className={inputClass} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
