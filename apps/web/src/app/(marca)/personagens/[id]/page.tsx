import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/feedback";
import { ListGroup, ListRow } from "@/components/ui/card";
import { ArchiveCharacterButton } from "@/features/characters/archive-character-button";
import { SheetPanel, type SheetVersion } from "@/features/products/sheet-panel";
import { brandContext } from "@/server/brand/context";
import { listActionPrices } from "@/server/brand/credits";
import { getCharacterView } from "@/server/characters/service";
import { businessCodeOf } from "@/server/api/http";

/**
 * Tela [Marca] Personagem (MD-17): dados, fotos de referência, ficha (preparar, refazer, aprovar —
 * mesmo painel da ficha da peça), anúncios com ela e arquivar.
 */
export default function CharacterPage({ params }: PageProps<"/personagens/[id]">) {
  return (
    <Suspense fallback={<div className="h-80 animate-pulse rounded-[14px] bg-surface" />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/personagens/[id]">, "params">) {
  const { id } = await params;
  const { profile, t } = await brandContext();
  const p = t.personagens;
  const view = await getCharacterView(profile, id).catch((e) => (businessCodeOf(e) === "personagem_inexistente" ? null : Promise.reject(e)));
  if (!view) notFound();
  const prices = await listActionPrices();
  const price = (acao: string) => prices.find((x) => x.acao === acao)?.creditos ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={view.nome}
        subtitle={`${t.opcoes.generosModelo[view.genero]} · ${t.opcoes.faixasEtarias[view.faixa]}`}
        action={<ArchiveCharacterButton id={view.id} label={p.arquivar} confirm={p.arquivarConfirma} />}
      />
      {view.descricao && <p className="max-w-prose text-[15px] text-text-2">{view.descricao}</p>}
      {view.fotos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {view.fotos.map((f) =>
            f.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage
              <img key={f.id} src={f.url} alt="" className="size-24 rounded-[10px] object-cover" />
            ) : null,
          )}
        </div>
      )}
      <SheetPanel
        key={view.versoes.map((v) => `${v.id}:${v.status}`).join(",")}
        produtoId={view.id}
        versions={view.versoes as SheetVersion[]}
        prices={{ gerar: price("gerar_ficha_personagem"), refazer: price("refazer_ficha_personagem") }}
        hasPhotos
        t={{ produtos: t.produtos, copy: t.copy, erros: t.erros, refazer: t.refazer }}
        api={{ sheet: `/api/personagens/${view.id}/ficha`, approveBase: "/api/fichas-personagem/" }}
        texts={{
          fichaTitulo: p.fichaTitulo,
          fichaExplica: p.fichaExplica,
          gerarFicha: p.gerarFicha,
          refazerFicha: p.refazer,
          aprovarFicha: p.aprovar,
          fichaGerando: p.fichaGerando,
          fichaPronta: p.fichaPronta,
          fichaFotosCongeladas: p.fichaAprovadaDica,
          refazerExemplo: p.refazerExemplo,
          fichaAlt: p.fichaAlt,
        }}
      />
      <ListGroup title={p.anunciosCom}>
        {view.anuncios.length === 0 && <ListRow label={<span className="text-text-2">{p.nenhumAnuncio}</span>} />}
        {view.anuncios.map((a) => (
          <ListRow key={a.id} label={<Link href={`/anuncios/${a.id}`} className="hover:underline">{a.titulo}</Link>} value={t.opcoes.statusAnuncio[a.status as keyof typeof t.opcoes.statusAnuncio]} />
        ))}
      </ListGroup>
    </div>
  );
}
