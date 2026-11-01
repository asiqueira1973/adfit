import { describe, expect, it } from "vitest";
import { aggregateCosts, costsCsv, monthKey, type CostInputs } from "./costs";

/** Critério 8.8 ([Admin] Custos), seção 14 (CSV) e seção 21 (métricas). */
const BASE: CostInputs = {
  brands: [{ id: "m1", nome: "Marca Um" }, { id: "m2", nome: "Marca; Dois" }],
  ads: [
    { marca_id: "m1", criado_em: "2026-10-05T12:00:00Z", status: "pronto" },
    { marca_id: "m1", criado_em: "2026-10-06T12:00:00Z", status: "falhou" },
    { marca_id: "m1", criado_em: "2026-11-01T12:00:00Z", status: "pronto" },
  ],
  moves: [
    { marca_id: "m1", criado_em: "2026-10-05T12:00:00Z", tipo: "consumo", acao: "gerar_roteiro_quadros", quantidade: -2 },
    { marca_id: "m1", criado_em: "2026-10-05T13:00:00Z", tipo: "consumo", acao: "gerar_video", quantidade: -45 },
    { marca_id: "m1", criado_em: "2026-10-05T14:00:00Z", tipo: "estorno", acao: "gerar_video", quantidade: 15 },
    { marca_id: "m1", criado_em: "2026-10-06T12:00:00Z", tipo: "compra", acao: null, quantidade: 60, valor_pago_centavos: 10000, moeda: "brl", pagamento_id: null },
  ],
  gens: [
    { marca_id: "m1", criado_em: "2026-10-05T12:10:00Z", custo_usd: 0.2 },
    { marca_id: "m1", criado_em: "2026-10-05T13:10:00Z", custo_usd: 4.83 },
    { marca_id: "m1", criado_em: "2026-10-05T13:20:00Z", custo_usd: null },
  ],
  payments: [{ marca_id: "m1", pago_em: "2026-10-07T12:00:00Z", valor_centavos: 3600, moeda: "usd" }],
  downloads: [{ marca_id: "m1", criado_em: "2026-10-08T12:00:00Z" }, { marca_id: "m1", criado_em: "2026-10-09T12:00:00Z" }],
  cotacaoUsdBrl: 5.5,
  cotacoes: { usd: 5.5, eur: 6 },
};

describe("aggregateCosts", () => {
  it("agrega por marca e mês: créditos, custo, receita convertida e margem", () => {
    const r = aggregateCosts(BASE, { mes: "2026-10" });
    expect(r.rows).toHaveLength(1);
    const row = r.rows[0];
    expect(row).toMatchObject({ marca: "Marca Um", mes: "2026-10", anuncios_criados: 2, anuncios_prontos: 1, videos_gerados: 1, creditos_consumidos: 47, creditos_estornados: 15, downloads: 2 });
    expect(row.custo_usd).toBeCloseTo(5.03, 4);
    expect(row.custo_brl).toBeCloseTo(27.665, 3);
    // 36 USD × 5,5 = 198 + compra manual de R$ 100 = 298
    expect(row.receita_brl).toBeCloseTo(298, 3);
    expect(row.receita_original).toEqual({ usd: 3600, brl: 10000 });
    expect(row.margem_brl).toBeCloseTo(298 - 27.665, 3);
  });

  it("métricas da seção 21 sobre o período filtrado", () => {
    const m = aggregateCosts(BASE, { mes: "2026-10" }).metricas;
    expect(m.pctProntos).toBeCloseTo(0.5);
    expect(m.creditosPorAnuncioPronto).toBeCloseTo(32); // (47 − 15) / 1
    expect(m.downloadsPorSemana).toBeCloseTo(2 / (31 / 7), 4);
    expect(m.margemPct).toBeCloseTo((298 - 27.665) / 298, 4);
  });

  it("filtra por marca; sem mês, uma linha por marca e mês", () => {
    expect(aggregateCosts(BASE, { marcaId: "m2" }).rows).toEqual([]);
    expect(aggregateCosts(BASE, {}).rows.map((r) => r.mes)).toEqual(["2026-11", "2026-10"]);
  });

  it("mês pelo fuso de São Paulo (00:30 UTC do dia 1º ainda é o mês anterior)", () => {
    expect(monthKey("2026-11-01T00:30:00Z")).toBe("2026-10");
  });
});

describe("costsCsv (seção 14)", () => {
  it("BOM, ';', vírgula decimal, colunas na ordem do spec e campo com ';' entre aspas", () => {
    const csv = costsCsv(aggregateCosts({ ...BASE, ads: [...BASE.ads, { marca_id: "m2", criado_em: "2026-10-01T12:00:00Z", status: "falhou" }] }, { mes: "2026-10" }).rows);
    expect(csv.startsWith("﻿")).toBe(true);
    const [head, ...lines] = csv.slice(1).trim().split("\r\n");
    expect(head).toBe("marca;mes;anuncios_criados;videos_gerados;creditos_consumidos;creditos_estornados;custo_usd;custo_brl;receita_moeda_original;receita_brl;taxas_stripe_brl;margem_brl;margem_percentual");
    expect(lines[0]).toBe("Marca Um;10/2026;2;1;47;15;5,03;27,67;36,00 usd + 100,00 brl;298,00;;270,34;90,7");
    expect(lines[1].startsWith('"Marca; Dois";10/2026;1;0;0;0;0,00;0,00;;0,00;;0,00;')).toBe(true);
  });
});
