import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, ListGroup, ListRow } from "@/components/ui/card";
import { Banner, PageHeader } from "@/components/ui/feedback";
import { cn } from "@/components/ui/cn";
import { fxLedger, fxPayments, fxPriceRows, PAYMENT_BADGE } from "@/features/fixtures";
import { readFlags } from "@/features/fixtures/flags";
import { COPY } from "@/lib/copy";
import { costSuffix, formatDate, formatMoney, signedCredits } from "@/lib/format";

/**
 * Tela [Marca] Créditos (seção 10 e critério 8.8): saldo, "Comprar créditos", extrato
 * (data, descrição, item com link, quantidade, saldo após; compras com valor e moeda),
 * tabela de preços por ação e histórico de pagamentos. `?estado=cancelada` mostra o retorno
 * do cancel_url da Stripe (seção 4.5).
 */
export default function CreditsPage({ searchParams }: PageProps<"/creditos">) {
  return (
    <Suspense>
      <CreditsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function CreditsContent({ searchParams }: { searchParams: PageProps<"/creditos">["searchParams"] }) {
  const flags = readFlags(await searchParams);
  return (
    <div className="flex flex-col gap-7">
      <PageHeader title="Créditos" />
      {flags.estado === "cancelada" && <Banner tone="info">{COPY.compraCancelada}</Banner>}

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[13px] font-medium text-text-2">Saldo da marca</div>
          <div className="flex items-baseline gap-1.5">
            <span className="tabular text-[44px] font-bold leading-none tracking-tight">{flags.saldo}</span>
            <span className="text-[15px] text-text-2">créditos</span>
          </div>
        </div>
        {!flags.pausada && <ButtonLink href="/creditos/comprar">Comprar créditos</ButtonLink>}
      </Card>

      <ListGroup title="Extrato">
        {fxLedger.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px]">{m.descricao}</div>
              <div className="truncate text-[13px] text-text-2">
                {formatDate(m.data)}
                {m.item && " · "}
                {m.href ? <Link href={m.href} className="text-brand-text">{m.item}</Link> : m.item}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className={cn("tabular text-[15px] font-semibold", m.quantidade > 0 ? "text-success" : "text-text")}>{signedCredits(m.quantidade)}</div>
              <div className="tabular text-[12px] text-text-2">saldo {m.saldo_apos}</div>
            </div>
          </div>
        ))}
      </ListGroup>

      <ListGroup title="Quanto custa cada ação" footer="Refazer por falha nossa não cobra: os créditos voltam sozinhos.">
        {fxPriceRows.map((p) => (
          <ListRow key={p.acao} label={p.descricao} value={<span className="tabular">{costSuffix(p.creditos)}</span>} />
        ))}
      </ListGroup>

      <ListGroup title="Pagamentos">
        {fxPayments.map((p) => (
          <ListRow
            key={p.id}
            label={`${p.pacote} · ${p.creditos} créditos`}
            detail={`${formatDate(p.data)} · ${formatMoney(p.valor_centavos, p.moeda)}`}
            value={<Badge tone={PAYMENT_BADGE[p.status].tone}>{PAYMENT_BADGE[p.status].label}</Badge>}
          />
        ))}
      </ListGroup>
    </div>
  );
}
