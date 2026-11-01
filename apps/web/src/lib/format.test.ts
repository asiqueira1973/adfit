import { describe, expect, it } from "vitest";
import { costSuffix, formatMoney, signedCredits, typicalAds } from "./format";
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
  it("anúncios típicos = créditos ÷ 20 para baixo (seção 15)", () => {
    expect(typicalAds(50)).toBe(2);
    expect(typicalAds(120)).toBe(6);
  });
  it("extrato com sinal", () => {
    expect(signedCredits(100)).toBe("+100");
    expect(signedCredits(-2)).toBe("−2");
  });
  it("preenche placeholders da seção 15", () => {
    expect(fill(COPY.compraConcluida, { n: 50 })).toBe("Pronto! 50 créditos adicionados.");
  });
});
