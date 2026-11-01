import Image from "next/image";
import { Check } from "lucide-react";
import { cn } from "./cn";

/**
 * Cartão grande de opção com miniatura fotográfica (assistente de anúncio, seção 10/11.4).
 * Recebe: rótulo, imagem, se está selecionado e o handler. Devolve: o cartão (radio acessível).
 */
export function OptionCard({
  name,
  value,
  label,
  image,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  label: string;
  image?: string;
  checked: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-col overflow-hidden rounded-[14px] bg-surface outline-2 -outline-offset-2",
        checked ? "outline outline-text" : "outline-transparent",
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange?.(value)} className="sr-only" />
      {image && (
        <div className="relative aspect-square w-full">
          {/* URL assinada do Storage (externa) não passa pelo otimizador do Next; imagens locais passam. */}
          <Image src={image} alt="" fill unoptimized={image.startsWith("http")} sizes="(max-width: 640px) 50vw, 200px" className="object-cover" />
        </div>
      )}
      <span className="flex min-h-11 items-center justify-between gap-2 px-3 py-2 text-[14px] font-semibold">
        {label}
        {checked && (
          <span className="flex size-5 items-center justify-center rounded-full bg-text text-bg">
            <Check className="size-3.5" strokeWidth={3} />
          </span>
        )}
      </span>
    </label>
  );
}
