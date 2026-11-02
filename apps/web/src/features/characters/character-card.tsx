import Link from "next/link";
import { UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Cartão de personagem (MD-17): ficha (aprovada ou a última), nome, gênero/idade e selo.
 * Recebe: dados e rótulos traduzidos. Devolve: o link para a tela da personagem.
 */
export function CharacterCard({ id, nome, detalhe, imagem, status, statusLabel }: { id: string; nome: string; detalhe: string; imagem: string | null; status: "pronta" | "gerando" | "confira" | "sem_ficha"; statusLabel: string }) {
  return (
    <Link href={`/personagens/${id}`} className="group flex flex-col gap-2">
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-[14px] bg-[#EDEDED]">
        {imagem ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage
          <img src={imagem} alt="" className="size-full object-cover transition-transform group-hover:scale-[1.02]" />
        ) : (
          <UserRound className="size-8 text-text-2" />
        )}
      </div>
      <div className="flex flex-col items-start gap-1">
        <div className="line-clamp-1 text-[15px] font-semibold">{nome}</div>
        <div className="flex items-center gap-2 text-[12px] text-text-2">
          {detalhe}
          <Badge tone={status === "pronta" ? "success" : status === "gerando" ? "processing" : status === "confira" ? "warning" : "neutral"}>{statusLabel}</Badge>
        </div>
      </div>
    </Link>
  );
}
