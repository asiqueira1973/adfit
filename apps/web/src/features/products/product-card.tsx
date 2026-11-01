import Link from "next/link";
import { Shirt } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/badge";

const TONE: Record<"sem_ficha" | "gerando" | "pronto", Tone> = { sem_ficha: "neutral", gerando: "processing", pronto: "success" };

/**
 * Cartão de produto (seção 10; critério 8.3: selo "Sem ficha"): foto ou ficha, nome, categoria e selo.
 * Recebe: dados do produto e rótulos já traduzidos. Devolve: o link para a tela do produto.
 */
export function ProductCard({ id, nome, categoria, status, imagem, statusLabel }: { id: string; nome: string; categoria: string; status: "sem_ficha" | "gerando" | "pronto"; imagem: string | null; statusLabel: string }) {
  return (
    <Link href={`/produtos/${id}`} className="group flex flex-col gap-2">
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[14px] bg-surface">
        {imagem ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage
          <img src={imagem} alt="" className="size-full object-cover transition-transform group-hover:scale-[1.02]" />
        ) : (
          <Shirt className="size-8 text-text-2" />
        )}
      </div>
      <div className="flex flex-col items-start gap-1">
        <div className="line-clamp-1 text-[15px] font-semibold">{nome}</div>
        <div className="flex items-center gap-2 text-[12px] text-text-2">
          {categoria}
          <Badge tone={TONE[status]}>{statusLabel}</Badge>
        </div>
      </div>
    </Link>
  );
}
