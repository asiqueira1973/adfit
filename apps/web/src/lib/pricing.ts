/**
 * Estimativa de um anúncio completo para a tabela de preços (pedido do Alexandre, 01/11/2026):
 * criar o anúncio (roteiro + imagens das 3 cenas) + gerar o vídeo, e o valor de 1 crédito pelos
 * pacotes à venda (do mais barato por crédito ao mais caro), na moeda do 1º pacote.
 * Recebe: preços das ações e pacotes ativos. Devolve: créditos e faixas em centavos (null sem pacote).
 */
export function adEstimate(
  prices: Array<{ acao: string; creditos: number }>,
  packs: Array<{ creditos: number; preco_centavos: number; moeda: string }>,
) {
  const of = (acao: string) => prices.find((p) => p.acao === acao)?.creditos ?? 0;
  const creditos = of("gerar_roteiro_quadros") + of("gerar_video");
  const moeda = packs[0]?.moeda ?? null;
  const perCredit = packs.filter((p) => p.moeda === moeda && p.creditos > 0).map((p) => Math.round(p.preco_centavos / p.creditos));
  if (!moeda || !perCredit.length) return { creditos, moeda: null, creditoMin: null, creditoMax: null, anuncioMin: null, anuncioMax: null };
  const creditoMin = Math.min(...perCredit);
  const creditoMax = Math.max(...perCredit);
  return { creditos, moeda, creditoMin, creditoMax, anuncioMin: creditos * creditoMin, anuncioMax: creditos * creditoMax };
}
