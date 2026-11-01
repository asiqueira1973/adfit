import { describe, expect, it } from "vitest";
import { adEstimate, packagesForLocale } from "./pricing";

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

/**
 * Moeda do pacote pelo idioma (01/11/2026): a conta Stripe brasileira só cobra cartão brasileiro em
 * BRL ("Seu cartão não aceita essa moeda" no checkout em USD). pt-BR → BRL; inglês → USD.
 */
describe("packagesForLocale", () => {
  const packs = [
    { id: "u60", moeda: "usd" },
    { id: "b60", moeda: "brl" },
    { id: "u150", moeda: "usd" },
    { id: "b150", moeda: "brl" },
  ];
  it("pt-BR vê só os pacotes em reais; inglês só os em dólar", () => {
    expect(packagesForLocale(packs, "pt_br").map((p) => p.id)).toEqual(["b60", "b150"]);
    expect(packagesForLocale(packs, "en").map((p) => p.id)).toEqual(["u60", "u150"]);
  });
  it("sem pacote na moeda do idioma, mostra os que houver", () => {
    expect(packagesForLocale(packs.filter((p) => p.moeda === "usd"), "pt_br").map((p) => p.id)).toEqual(["u60", "u150"]);
  });
});
