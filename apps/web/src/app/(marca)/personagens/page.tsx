import { Suspense } from "react";
import { Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { CharacterCard } from "@/features/characters/character-card";
import { brandContext } from "@/server/brand/context";
import { listCharacters } from "@/server/characters/service";

/**
 * Tela [Marca] Personagens (MD-17): catálogo das modelos da marca com a ficha e o selo
 * (pronta, preparando, sem ficha) e "Nova personagem".
 */
export default function CharactersPage() {
  return (
    <Suspense fallback={<div className="h-60 animate-pulse rounded-[14px] bg-surface" />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const { profile, t } = await brandContext();
  const p = t.personagens;
  const chars = await listCharacters(profile.marcaId);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={p.titulo} subtitle={p.subtitulo} action={<ButtonLink href="/personagens/nova" className="px-3"><Plus className="size-4.5" /> {p.nova}</ButtonLink>} />
      {chars.length === 0 ? (
        <EmptyState text={p.vazio} action={<ButtonLink href="/personagens/nova">{p.nova}</ButtonLink>} />
      ) : (
        <div className="grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2 md:grid-cols-3">
          {chars.map((c) => {
            const status = c.pronta ? "pronta" : c.gerando ? "gerando" : "sem_ficha";
            return (
              <CharacterCard
                key={c.id}
                id={c.id}
                nome={c.nome}
                detalhe={`${t.opcoes.generosModelo[c.genero]} · ${t.opcoes.faixasEtarias[c.faixa]}`}
                imagem={c.imagem}
                status={status}
                statusLabel={status === "pronta" ? p.pronta : status === "gerando" ? p.preparando : p.semFicha}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
