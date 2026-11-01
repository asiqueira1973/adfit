import "server-only";
import { createAdminClient } from "../db/supabase";

/**
 * [Admin] Custos (critério 8.8; seções 14 e 21). Cálculo puro em `aggregateCosts` (testado) e
 * leitura das tabelas em `loadCostInputs` (service role; tela só para admin).
 */

export type CostInputs = {
  brands: Array<{ id: string; nome: string }>;
  ads: Array<{ marca_id: string; criado_em: string; status: string }>;
  moves: Array<{ marca_id: string; criado_em: string; tipo: string; acao: string | null; quantidade: number; valor_pago_centavos?: number | null; moeda?: string | null; pagamento_id?: string | null }>;
  gens: Array<{ marca_id: string; criado_em: string; custo_usd: number | null }>;
  payments: Array<{ marca_id: string; pago_em: string | null; valor_centavos: number; moeda: string }>;
  downloads: Array<{ marca_id: string; criado_em: string }>;
  cotacaoUsdBrl: number;
  /** Cotações para converter receita em BRL (`cotacoes_para_brl`); BRL vale 1. */
  cotacoes: Record<string, number>;
};

export type CostFilter = { marcaId?: string | null; mes?: string | null };

export type CostRow = {
  marcaId: string;
  marca: string;
  mes: string;
  anuncios_criados: number;
  anuncios_prontos: number;
  videos_gerados: number;
  creditos_consumidos: number;
  creditos_estornados: number;
  downloads: number;
  custo_usd: number;
  custo_brl: number;
  /** Receita por moeda, em centavos. */
  receita_original: Record<string, number>;
  receita_brl: number;
  margem_brl: number;
};

const SP_MONTH = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" });

/** Mês (aaaa-mm) de um instante no fuso de São Paulo. Recebe: ISO. Devolve: "2026-10". */
export function monthKey(iso: string): string {
  const parts = SP_MONTH.formatToParts(new Date(iso));
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}

/** Dias de um mês aaaa-mm. */
function daysIn(mes: string): number {
  const [y, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Agrega por marca e mês: anúncios criados/prontos, vídeos gerados, créditos consumidos e
 * estornados, downloads, custo USD real (soma de `geracoes.custo_usd`) e em R$ (`cotacao_usd_brl`),
 * receita (pagamentos `pago` + compras lançadas pelo admin) convertida por `cotacoes_para_brl`, e
 * margem. Métricas da seção 21 sobre o período. Recebe: dados e filtro. Devolve: linhas (mês mais
 * recente primeiro), totais e métricas.
 */
export function aggregateCosts(input: CostInputs, filter: CostFilter) {
  const names = new Map(input.brands.map((b) => [b.id, b.nome]));
  const rows = new Map<string, CostRow>();
  const keep = (marcaId: string, iso: string | null) => {
    if (!iso) return null;
    if (filter.marcaId && marcaId !== filter.marcaId) return null;
    const mes = monthKey(iso);
    if (filter.mes && mes !== filter.mes) return null;
    const key = `${marcaId}|${mes}`;
    let row = rows.get(key);
    if (!row) {
      row = { marcaId, marca: names.get(marcaId) ?? marcaId, mes, anuncios_criados: 0, anuncios_prontos: 0, videos_gerados: 0, creditos_consumidos: 0, creditos_estornados: 0, downloads: 0, custo_usd: 0, custo_brl: 0, receita_original: {}, receita_brl: 0, margem_brl: 0 };
      rows.set(key, row);
    }
    return row;
  };
  const rate = (moeda: string) => (moeda === "brl" ? 1 : (input.cotacoes[moeda] ?? 0));
  const addRevenue = (row: CostRow, cents: number, moeda: string) => {
    row.receita_original[moeda] = (row.receita_original[moeda] ?? 0) + cents;
    row.receita_brl += (cents / 100) * rate(moeda);
  };

  for (const a of input.ads) {
    const row = keep(a.marca_id, a.criado_em);
    if (!row) continue;
    row.anuncios_criados++;
    if (a.status === "pronto") row.anuncios_prontos++;
  }
  for (const m of input.moves) {
    const row = keep(m.marca_id, m.criado_em);
    if (!row) continue;
    if (m.tipo === "consumo") {
      row.creditos_consumidos += -m.quantidade;
      if (m.acao === "gerar_video") row.videos_gerados++;
    } else if (m.tipo === "estorno") row.creditos_estornados += m.quantidade;
    // Compra lançada à mão pelo admin (sem pagamento da Stripe) também é receita.
    else if (m.tipo === "compra" && !m.pagamento_id && m.valor_pago_centavos && m.moeda) addRevenue(row, m.valor_pago_centavos, m.moeda);
  }
  for (const g of input.gens) {
    const row = keep(g.marca_id, g.criado_em);
    if (row && g.custo_usd) row.custo_usd += Number(g.custo_usd);
  }
  for (const p of input.payments) {
    const row = keep(p.marca_id, p.pago_em);
    if (row) addRevenue(row, p.valor_centavos, p.moeda);
  }
  for (const d of input.downloads) {
    const row = keep(d.marca_id, d.criado_em);
    if (row) row.downloads++;
  }
  const list = [...rows.values()];
  for (const r of list) {
    r.custo_brl = r.custo_usd * input.cotacaoUsdBrl;
    r.margem_brl = r.receita_brl - r.custo_brl;
  }
  list.sort((a, b) => b.mes.localeCompare(a.mes) || a.marca.localeCompare(b.marca));

  const sum = (k: keyof Pick<CostRow, "anuncios_criados" | "anuncios_prontos" | "creditos_consumidos" | "creditos_estornados" | "downloads" | "custo_usd" | "custo_brl" | "receita_brl" | "margem_brl" | "videos_gerados">) => list.reduce((s, r) => s + r[k], 0);
  const totais = {
    anuncios_criados: sum("anuncios_criados"),
    anuncios_prontos: sum("anuncios_prontos"),
    videos_gerados: sum("videos_gerados"),
    creditos_consumidos: sum("creditos_consumidos"),
    creditos_estornados: sum("creditos_estornados"),
    downloads: sum("downloads"),
    custo_usd: sum("custo_usd"),
    custo_brl: sum("custo_brl"),
    receita_brl: sum("receita_brl"),
    margem_brl: sum("margem_brl"),
  };
  // Semanas do período: o mês filtrado ou, sem filtro, do 1º mês com dado até hoje.
  const meses = [...new Set(list.map((r) => r.mes))];
  const dias = filter.mes ? daysIn(filter.mes) : meses.reduce((s, m) => s + daysIn(m), 0);
  const metricas = {
    pctProntos: totais.anuncios_criados ? totais.anuncios_prontos / totais.anuncios_criados : null,
    downloadsPorSemana: dias ? totais.downloads / (dias / 7) : null,
    creditosPorAnuncioPronto: totais.anuncios_prontos ? (totais.creditos_consumidos - totais.creditos_estornados) / totais.anuncios_prontos : null,
    margemPct: totais.receita_brl ? totais.margem_brl / totais.receita_brl : null,
  };
  return { rows: list, totais, metricas };
}

/** Decimal com vírgula, arredondando a metade para cima sem erro de ponto flutuante (270,335 → 270,34). */
const dec = (n: number, places = 2) => {
  const f = 10 ** places;
  return (Math.round(Number((n * f).toPrecision(12))) / f).toFixed(places).replace(".", ",");
};
const cell = (v: string) => (/[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/**
 * CSV da seção 14: UTF-8 com BOM, separador `;`, decimal com vírgula, uma linha por marca no mês,
 * colunas na ordem do spec (`taxas_stripe_brl` vazio no MVP). Recebe: linhas. Devolve: o texto.
 */
export function costsCsv(rows: CostRow[]): string {
  const head = ["marca", "mes", "anuncios_criados", "videos_gerados", "creditos_consumidos", "creditos_estornados", "custo_usd", "custo_brl", "receita_moeda_original", "receita_brl", "taxas_stripe_brl", "margem_brl", "margem_percentual"];
  const lines = rows.map((r) => {
    const [y, m] = r.mes.split("-");
    const original = Object.entries(r.receita_original)
      .sort(([a], [b]) => (a === "brl" ? 1 : b === "brl" ? -1 : a.localeCompare(b)))
      .map(([moeda, cents]) => `${dec(cents / 100)} ${moeda}`)
      .join(" + ");
    return [
      cell(r.marca),
      `${m}/${y}`,
      String(r.anuncios_criados),
      String(r.videos_gerados),
      String(r.creditos_consumidos),
      String(r.creditos_estornados),
      dec(r.custo_usd),
      dec(r.custo_brl),
      cell(original),
      dec(r.receita_brl),
      "",
      dec(r.margem_brl),
      r.receita_brl ? dec((r.margem_brl / r.receita_brl) * 100, 1) : "",
    ].join(";");
  });
  return `﻿${[head.join(";"), ...lines].join("\r\n")}\r\n`;
}

/**
 * Lê das tabelas o necessário para o relatório (service role; só admin chama). Recebe: nada.
 * Devolve: CostInputs. Volume do piloto é pequeno; a agregação é feita no servidor em memória.
 */
export async function loadCostInputs(): Promise<CostInputs> {
  const db = createAdminClient();
  const [brands, ads, moves, gens, payments, downloads, config] = await Promise.all([
    db.from("marcas").select("id, nome"),
    db.from("anuncios").select("marca_id, criado_em, status"),
    db.from("movimentacoes_creditos").select("marca_id, criado_em, tipo, acao, quantidade, valor_pago_centavos, moeda, pagamento_id"),
    db.from("geracoes").select("marca_id, criado_em, custo_usd"),
    db.from("pagamentos").select("marca_id, pago_em, valor_centavos, moeda").eq("status", "pago"),
    db.from("downloads_anuncio").select("marca_id, criado_em"),
    db.from("configuracoes").select("chave, valor").in("chave", ["cotacao_usd_brl", "cotacoes_para_brl"]),
  ]);
  for (const r of [brands, ads, moves, gens, payments, downloads, config]) if (r.error) throw r.error;
  const cfg = Object.fromEntries((config.data ?? []).map((c) => [c.chave, c.valor]));
  return {
    brands: brands.data ?? [],
    ads: ads.data ?? [],
    moves: (moves.data ?? []) as CostInputs["moves"],
    gens: (gens.data ?? []).map((g) => ({ ...g, custo_usd: g.custo_usd === null ? null : Number(g.custo_usd) })),
    payments: payments.data ?? [],
    downloads: downloads.data ?? [],
    cotacaoUsdBrl: Number(cfg.cotacao_usd_brl ?? 5.5),
    cotacoes: (cfg.cotacoes_para_brl as Record<string, number> | undefined) ?? {},
  };
}
