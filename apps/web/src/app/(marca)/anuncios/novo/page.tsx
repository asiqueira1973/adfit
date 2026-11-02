import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { NewAdWizard } from "@/features/ads/new-ad-wizard";
import { JourneySteps } from "@/features/journey/journey-steps";
import { brandContext } from "@/server/brand/context";
import { listActionPrices } from "@/server/brand/credits";
import { listProducts } from "@/server/products/queries";
import { listCharacters } from "@/server/characters/service";

/**
 * Tela [Marca] Novo anúncio (seção 10; critério 8.5): só produtos com ficha aprovada (a imagem é a
 * ficha), preço real de `gerar_roteiro_quadros`. `?produto=` pré-escolhe ("Novo anúncio com este
 * produto"). Sem produto elegível: estado vazio que leva a Produtos.
 */
export default function NewAdPage({ searchParams }: PageProps<"/anuncios/novo">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-xl animate-pulse rounded-[14px] bg-surface" />}>
      <Wizard searchParams={searchParams} />
    </Suspense>
  );
}

async function Wizard({ searchParams }: { searchParams: PageProps<"/anuncios/novo">["searchParams"] }) {
  const sp = await searchParams;
  const { profile, t } = await brandContext();
  const [products, prices, chars] = await Promise.all([listProducts(profile.marcaId), listActionPrices(), listCharacters(profile.marcaId, { soProntas: true })]);
  // Personagens prontas do catálogo (MD-17).
  const characters = chars.map((ch) => ({ id: ch.id, nome: ch.nome, detalhe: `${t.opcoes.generosModelo[ch.genero]} · ${t.opcoes.faixasEtarias[ch.faixa]}`, imagem: ch.imagem }));
  const eligible = products.filter((p) => p.status === "pronto").map((p) => ({ id: p.id, nome: p.nome, genero_alvo: p.genero_alvo, imagem: p.imagem }));
  if (!eligible.length) {
    return <EmptyState image="/images/vazio-produtos.jpg" text={t.anuncios.semProdutos} action={<ButtonLink href="/produtos">{t.anuncios.irParaProdutos}</ButtonLink>} />;
  }
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <JourneySteps current="escolhas" t={t.jornada} />
      <NewAdWizard
      products={eligible}
      price={prices.find((p) => p.acao === "gerar_roteiro_quadros")?.creditos ?? 0}
      initialProductId={typeof sp.produto === "string" ? sp.produto : undefined}
      characters={characters}
      t={{ anuncios: t.anuncios, opcoes: t.opcoes, erros: t.erros, personagens: t.personagens }}
      />
    </div>
  );
}
