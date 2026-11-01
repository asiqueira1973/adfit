import { describe, expect, it } from "vitest";
import { adEstimate } from "./pricing";

/** Tabela de preços (pedido do Alexandre, 01/11/2026): custo médio de um anúncio e valor do crédito. */
describe("adEstimate", () => {
  const prices = [
    { acao: "gerar_ficha", creditos: 2 },
    { acao: "gerar_roteiro_quadros", creditos: 2 },
    { acao: "gerar_video", creditos: 45 },
    { acao: "refazer_quadro", creditos: 1 },
  ];
  const packs = [
    { creditos: 60, preco_centavos: 3600, moeda: "usd" },
    { creditos: 150, preco_centavos: 8100, moeda: "usd" },
  ];

  it("anúncio completo = criar (roteiro + imagens) + gerar vídeo; crédito pelo pacote mais barato e mais caro", () => {
    const e = adEstimate(prices, packs)!;
    expect(e.creditos).toBe(47);
    expect(e.moeda).toBe("usd");
    expect(e.creditoMin).toBe(54); // 8100/150 = 54 centavos
    expect(e.creditoMax).toBe(60); // 3600/60
    expect(e.anuncioMin).toBe(47 * 54);
    expect(e.anuncioMax).toBe(47 * 60);
  });

  it("sem pacotes à venda devolve só os créditos", () => {
    expect(adEstimate(prices, [])).toEqual({ creditos: 47, moeda: null, creditoMin: null, creditoMax: null, anuncioMin: null, anuncioMax: null });
  });
});
