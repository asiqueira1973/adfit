import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AD_BADGE, type AdStatus } from "@/features/fixtures";
import { formatDate } from "@/lib/format";

/**
 * Cartão de anúncio da biblioteca e do Início (seção 10): miniatura, título, data e selo de status.
 * Recebe: dados do anúncio. Devolve: o link para a tela do anúncio.
 */
export function AdCard({ id, titulo, status, thumb, criado_em }: { id: string; titulo: string; status: AdStatus; thumb: string; criado_em: string }) {
  const badge = AD_BADGE[status];
  return (
    <Link href={`/anuncios/${id}`} className="group flex flex-col gap-2">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-surface">
        <Image src={thumb} alt="" fill sizes="(max-width: 768px) 50vw, 240px" className="object-cover transition-transform group-hover:scale-[1.02]" />
        <Badge tone={badge.tone} className="absolute left-2 top-2 bg-bg/90 backdrop-blur">{badge.label}</Badge>
      </div>
      <div>
        <div className="line-clamp-2 text-[14px] font-semibold leading-snug">{titulo}</div>
        <div className="text-[12px] text-text-2">{formatDate(criado_em)}</div>
      </div>
    </Link>
  );
}
