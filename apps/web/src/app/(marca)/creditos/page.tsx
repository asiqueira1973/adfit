import Link from "next/link";
import { Suspense } from "react";
import { Badge, type Tone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, ListGroup, ListRow } from "@/components/ui/card";
import { Banner, PageHeader } from "@/components/ui/feedback";
import { cn } from "@/components/ui/cn";
import { fill } from "@/lib/copy";
import { costSuffix, formatDate, formatMoney, signedCredits } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { brandContext } from "@/server/brand/context";
import { listActionPrices, listActivePackages, listBrandLedger, listBrandPayments } from "@/server/brand/credits";
import { adEstimate, packagesForLocale } from "@/lib/pricing";

const PAYMENT_TONE: Record<string, Tone> = { iniciado: "processing", pago: "success", falhou: "danger", expirado: "neutral", reembolsado: "warning" };

/**
 * Tela [Marca] Créditos (seção 10; critérios 8.8 e 8.9): saldo, "Comprar créditos", extrato
 * (data, descrição, quantidade, saldo após; compras com valor e moeda), preços por ação e
 * histórico de pagamentos. `?compra=cancelada` = retorno do cancel_url da Stripe (seção 4.5).
 */
export default function CreditsPage({ searchParams }: PageProps<"/creditos">) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-[14px] bg-surface" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

type LedgerItem = Awaited<ReturnType<typeof listBrandLedger>>[number];

/** Descrição de uma movimentação para o lojista (sem jargão, princípio 5). */
function describe(m: LedgerItem, t: Dictionary): string {
  if (m.acao) return m.tipo === "estorno" ? `${t.admin.tipoMovimentacao.estorno} · ${t.admin.acoes[m.acao]}` : t.admin.acoes[m.acao];
  return t.admin.tipoMovimentacao[m.tipo];
}

async function Content({ searchParams }: { searchParams: PageProps<"/creditos">["searchParams"] }) {
  const { profile, brand, t, intl } = await brandContext();
  const { compra } = await searchParams;
  const [ledger, prices, payments, packs] = await Promise.all([listBrandLedger(profile.marcaId), listActionPrices(), listBrandPayments(profile.marcaId), listActivePackages()]);
  // Custo médio de um anúncio e valor do crédito pelos pacotes (pedido do Alexandre, 01/11/2026).
  const est = adEstimate(prices, packagesForLocale(packs, profile.idioma));
  const money = (c: number) => formatMoney(c, est.moeda!, intl);
  const range = (min: number | null, max: number | null) => (min === null || max === null ? null : min === max ? money(min) : `${money(min)}–${money(max)}`);
  const costLabels = t.custo;

  return (
    <div className="flex flex-col gap-7">
      <PageHeader title={t.creditos.titulo} />
      {compra === "cancelada" && <Banner tone="info">{t.copy.compraCancelada}</Banner>}

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[13px] font-medium text-text-2">{t.creditos.saldoMarca}</div>
          <div className="flex items-baseline gap-1.5">
            <span className="tabular text-[44px] font-bold leading-none tracking-tight">{brand?.saldo_creditos ?? 0}</span>
            <span className="text-[15px] text-text-2">{t.custo.creditos}</span>
          </div>
        </div>
        {brand?.ativa && <ButtonLink href="/creditos/comprar">{t.creditos.comprar}</ButtonLink>}
      </Card>

      <ListGroup title={t.creditos.extrato}>
        {ledger.length === 0 && <ListRow label={<span className="text-text-2">{t.creditos.nenhumMovimento}</span>} />}
        {ledger.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px]">{describe(m, t)}</div>
              <div className="truncate text-[13px] text-text-2">
                {formatDate(m.criado_em, intl)}
                {m.valor_pago_centavos && m.moeda ? ` · ${formatMoney(m.valor_pago_centavos, m.moeda, intl)}` : ""}
                {m.referencia_tipo === "anuncio" && m.referencia_id ? <> · <Link href={`/anuncios/${m.referencia_id}`} className="text-brand-text">{t.nav.anuncios}</Link></> : null}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className={cn("tabular text-[15px] font-semibold", m.quantidade > 0 ? "text-success" : "text-text")}>{signedCredits(m.quantidade)}</div>
              <div className="tabular text-[12px] text-text-2">{fill(t.creditos.saldoApos, { n: m.saldo_apos })}</div>
            </div>
          </div>
        ))}
      </ListGroup>

      <ListGroup
        title={t.creditos.quantoCusta}
        footer={[est.creditoMin !== null ? fill(t.creditos.valorCredito, { valor: range(est.creditoMin, est.creditoMax)! }) : null, t.creditos.quantoCustaRodape].filter(Boolean).join(" ")}
      >
        <ListRow
          label={<span className="font-semibold">{t.creditos.anuncioMedio}</span>}
          detail={t.creditos.anuncioMedioDica}
          value={
            <span className="tabular text-right">
              <span className="block font-semibold">{est.creditos} {t.custo.creditos}</span>
              {est.anuncioMin !== null && <span className="block text-[13px] text-text-2">≈ {range(est.anuncioMin, est.anuncioMax)}</span>}
            </span>
          }
        />
        {prices.map((p) => (
          <ListRow key={p.acao} label={t.admin.acoes[p.acao]} value={<span className="tabular">{costSuffix(p.creditos, costLabels)}</span>} />
        ))}
      </ListGroup>

      <ListGroup title={t.creditos.pagamentos}>
        {payments.length === 0 && <ListRow label={<span className="text-text-2">{t.creditos.nenhumPagamento}</span>} />}
        {payments.map((p) => (
          <ListRow
            key={p.id}
            label={`${p.pacote} · ${fill(t.creditos.pacoteCreditos, { n: p.creditos })}`}
            detail={`${formatDate(p.criado_em, intl)} · ${formatMoney(p.valor_centavos, p.moeda, intl)}`}
            value={<Badge tone={PAYMENT_TONE[p.status]}>{t.admin.statusPagamento[p.status]}</Badge>}
          />
        ))}
      </ListGroup>
    </div>
  );
}
