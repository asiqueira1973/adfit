export type LedgerMaps = {
  /** ficha → produto */
  fichas: Record<string, string>;
  /** quadro → anúncio */
  quadros: Record<string, string>;
  /** clipe → anúncio */
  clipes: Record<string, string>;
  /** produto → nome */
  produtos: Record<string, string>;
  /** anúncio → título */
  anuncios: Record<string, string>;
};

/**
 * Item de uma movimentação do extrato (critério 8.8: "item (link)"): ficha leva ao produto; imagem
 * de cena, cena em vídeo e anúncio levam ao anúncio. Recebe: referência da movimentação e mapas.
 * Devolve: { href, label } ou null (sem referência, ou item que não existe/não é visível).
 */
export function ledgerItem(ref: { referencia_tipo: string | null; referencia_id: string | null }, maps: LedgerMaps): { href: string; label: string } | null {
  const id = ref.referencia_id;
  if (!id) return null;
  const produto = ref.referencia_tipo === "ficha" ? maps.fichas[id] : undefined;
  if (produto) return maps.produtos[produto] ? { href: `/produtos/${produto}`, label: maps.produtos[produto] } : null;
  const anuncio = ref.referencia_tipo === "anuncio" ? id : ref.referencia_tipo === "quadro" ? maps.quadros[id] : ref.referencia_tipo === "clipe" ? maps.clipes[id] : undefined;
  return anuncio && maps.anuncios[anuncio] ? { href: `/anuncios/${anuncio}`, label: maps.anuncios[anuncio] } : null;
}
