import { cn } from "./cn";

/**
 * Controle segmentado (escolha única entre poucas opções, ex.: Mulher/Homem).
 * Componente de apresentação: cada opção é um radio nativo, acessível por teclado.
 * Recebe: nome do grupo, opções e valor marcado. Devolve: o grupo.
 */
export function Segmented({
  name,
  options,
  value,
  onChange,
  label,
}: {
  name: string;
  label: string;
  options: Array<{ value: string; label: string; hint?: string }>;
  value: string;
  onChange?: (value: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-[13px] font-medium text-text-2">{label}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-[10px] bg-surface p-1">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-[8px] px-2 py-1.5 text-center text-[14px] font-semibold",
              value === o.value ? "bg-bg shadow-sm" : "text-text-2",
            )}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange?.(o.value)} className="sr-only" />
            {o.label}
            {o.hint && <span className="text-[11px] font-normal text-text-2">{o.hint}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
