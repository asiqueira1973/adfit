import { Suspense } from "react";
import { PageHeader } from "@/components/ui/feedback";
import { NewCharacterForm } from "@/features/characters/new-character-form";
import { brandContext } from "@/server/brand/context";
import { listActionPrices } from "@/server/brand/credits";

/** Tela [Marca] Nova personagem (MD-17): descrição, fotos opcionais e a ficha (cobrada). */
export default function NewCharacterPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-80 max-w-xl animate-pulse rounded-[14px] bg-surface" />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const { profile, t } = await brandContext();
  const prices = await listActionPrices();
  const preco = prices.find((x) => x.acao === "gerar_ficha_personagem")?.creditos ?? 0;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader title={t.personagens.nova} subtitle={t.personagens.novaSubtitulo} />
      <NewCharacterForm marcaId={profile.marcaId} preco={preco} t={{ personagens: t.personagens, opcoes: t.opcoes, copy: t.copy, erros: t.erros }} />
    </div>
  );
}
