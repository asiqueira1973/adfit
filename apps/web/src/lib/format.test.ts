import { describe, expect, it } from "vitest";
import { costSuffix, formatMoney, signedCredits, typicalAdCost, typicalAds } from "./format";
import { fill, COPY } from "./copy";

describe("format", () => {
  it("formata preço na moeda do pacote (8.9)", () => {
    expect(formatMoney(3000, "usd")).toBe("US$\u00a030,00");
    expect(formatMoney(6500, "eur")).toMatch(/65,00/);
  });
  it("rótulo de custo no botão (princípio 4)", () => {
    expect(costSuffix(2)).toBe("2 créditos");
    expect(costSuffix(1)).toBe("1 crédito");
    expect(costSuffix(0)).toBe("grátis");
  });
  it("anúncios típicos = créditos ÷ custo do anúncio típico, para baixo (seção 15 + MD-4)", () => {
    // MD-4: anúncio típico = criar anúncio (2) + gerar vídeo (51) = 53.
    const prices = { gerar_roteiro_quadros: 2, gerar_video: 51 };
    expect(typicalAdCost(prices)).toBe(53);
    expect(typicalAds(60, 53)).toBe(1);
    expect(typicalAds(150, 53)).toBe(2);
    // Preços originais do spec (2 + 12 = 14) continuam funcionando.
    expect(typicalAds(50, typicalAdCost({ gerar_roteiro_quadros: 2, gerar_video: 12 }))).toBe(3);
    expect(typicalAds(10, 0)).toBe(0);
  });
  it("extrato com sinal", () => {
    expect(signedCredits(100)).toBe("+100");
    expect(signedCredits(-2)).toBe("−2");
  });
  it("preenche placeholders da seção 15", () => {
    expect(fill(COPY.compraConcluida, { n: 50 })).toBe("Pronto! 50 créditos adicionados.");
  });
});
