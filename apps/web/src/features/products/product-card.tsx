import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PRODUCT_BADGE, type ProductStatus } from "@/features/fixtures";
import { CATEGORIA_LABEL, type Categoria } from "@/lib/labels";

/**
 * Cartão de produto (seção 10): foto ou ficha, nome, categoria e selo "Sem ficha"/"Pronto para anúncio".
 * Recebe: dados do produto. Devolve: o link para a tela do produto.
 */
export function ProductCard({ id, nome, categoria, status, imagem }: { id: string; nome: string; categoria: string; status: ProductStatus; imagem: string }) {
  const badge = PRODUCT_BADGE[status];
  return (
    <Link href={`/produtos/${id}`} className="group flex flex-col gap-2">
      <div className="relative aspect-square overflow-hidden rounded-[14px] bg-surface">
        <Image src={imagem} alt="" fill sizes="(max-width: 768px) 50vw, 240px" className="object-cover transition-transform group-hover:scale-[1.02]" />
      </div>
      <div className="flex flex-col items-start gap-1">
        <div className="line-clamp-1 text-[15px] font-semibold">{nome}</div>
        <div className="flex items-center gap-2 text-[12px] text-text-2">
          {CATEGORIA_LABEL[categoria as Categoria]}
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>
      </div>
    </Link>
  );
}
