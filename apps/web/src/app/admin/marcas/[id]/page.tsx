import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Coins, UserPlus } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ListGroup, ListRow } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/table";
import { cn } from "@/components/ui/cn";
import { BrandKitSection, InviteUserForm, LaunchCreditsForm, ToggleBrandButton, ToggleUserButton } from "@/features/admin/admin-forms";
import { formatDate, formatMoney, signedCredits } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { getBrandForAdmin, listBrandAds } from "@/server/admin/brands";
import { adminContext } from "@/server/admin/context";
import { listLedger, listPayments, type LedgerRow } from "@/server/admin/credits";
import { listUsers } from "@/server/admin/users";

const TABS = ["kit", "usuarios", "extrato", "pagamentos", "anuncios"] as const;
type Tab = (typeof TABS)[number];

const PAYMENT_TONE: Record<string, Tone> = { iniciado: "processing", pago: "success", falhou: "danger", expirado: "neutral", reembolsado: "warning" };
const AD_TONE: Record<string, Tone> = { gerando_roteiro: "processing", gerando_quadros: "processing", aguardando_aprovacao: "warning", gerando_clipes: "processing", montando: "processing", pronto: "success", falhou: "danger" };

/**
 * Tela [Admin] Marca (seção 10): abas Kit, Usuários, Extrato, Pagamentos, Anúncios; ações
 * "Lançar créditos", "Convidar usuário" e "Pausar/Reativar" (critério 8.2). `?aba=`, `?modal=creditos|convidar`.
 */
export default function AdminBrandPage({ params, searchParams }: PageProps<"/admin/marcas/[id]">) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-[14px] bg-surface" />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}

/** Descrição da movimentação no extrato (tipo + ação; compra mostra o valor pago). */
function describe(m: LedgerRow, t: Dictionary): string {
  if (m.acao) return `${t.admin.tipoMovimentacao[m.tipo]} · ${t.admin.acoes[m.acao as keyof Dictionary["admin"]["acoes"]]}`;
  return t.admin.tipoMovimentacao[m.tipo];
}

async function Content({ params, searchParams }: Pick<PageProps<"/admin/marcas/[id]">, "params" | "searchParams">) {
  const { t, intl } = await adminContext();
  const { id } = await params;
  const sp = await searchParams;
  const brand = await getBrandForAdmin(id);
  if (!brand) notFound();
  const tab: Tab = TABS.includes(sp.aba as Tab) ? (sp.aba as Tab) : "kit";
  const base = `/admin/marcas/${id}`;
  const labels: Record<Tab, string> = { kit: t.admin.abaKit, usuarios: t.admin.abaUsuarios, extrato: t.admin.abaExtrato, pagamentos: t.admin.abaPagamentos, anuncios: t.admin.abaAnuncios };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={brand.nome}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {brand.instagram && <>@{brand.instagram} ·</>}
            <span className="tabular">{brand.saldo_creditos} {t.admin.creditosUnidade}</span>
            <Badge tone={brand.ativa ? "success" : "warning"}>{brand.ativa ? t.admin.ativa : t.admin.pausada}</Badge>
          </span>
        }
      />
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={`${base}?aba=extrato&modal=creditos`}><Coins className="size-4.5" /> {t.admin.lancarCreditos}</ButtonLink>
        <ButtonLink href={`${base}?aba=usuarios&modal=convidar`} variant="secondary"><UserPlus className="size-4.5" /> {t.admin.convidarUsuario}</ButtonLink>
        <ToggleBrandButton t={t} id={brand.id} ativa={brand.ativa} />
      </div>

      <nav aria-label={brand.nome} className="-mx-4 flex gap-1 overflow-x-auto border-b border-hairline px-4 md:mx-0 md:px-0">
        {TABS.map((key) => (
          <Link key={key} href={`${base}?aba=${key}`} aria-current={tab === key ? "page" : undefined} className={cn("flex min-h-11 shrink-0 items-center border-b-2 px-3 text-[14px] font-semibold", tab === key ? "border-text text-text" : "border-transparent text-text-2")}>
            {labels[key]}
          </Link>
        ))}
      </nav>

      {tab === "kit" && (
        <BrandKitSection t={t} kit={{ id: brand.id, nome: brand.nome, instagram: brand.instagram, cor_destaque: brand.cor_destaque, cta_padrao: brand.cta_padrao, tom_de_voz: brand.tom_de_voz, idioma_anuncios: brand.idioma_anuncios }}>
          <ListGroup>
            <ListRow label={t.admin.kitNome} value={brand.nome} />
            <ListRow label={t.admin.kitInstagram} value={brand.instagram ? `@${brand.instagram}` : t.admin.vazio} />
            <ListRow label={t.admin.kitLogo} value={brand.logo_path ? t.admin.kitLogoEnviado : t.admin.kitLogoNaoEnviado} />
            <ListRow label={t.admin.kitCor} value={brand.cor_destaque ? <span className="flex items-center gap-2"><span className="size-4 rounded-full border border-hairline" style={{ background: brand.cor_destaque }} />{brand.cor_destaque}</span> : t.admin.vazio} />
            <ListRow label={t.admin.kitCta} value={brand.cta_padrao} />
            <ListRow label={t.admin.kitTom} value={brand.tom_de_voz ?? t.admin.vazio} />
            <ListRow label={t.admin.kitIdiomaAnuncios} value={t.idiomas[brand.idioma_anuncios]} />
          </ListGroup>
        </BrandKitSection>
      )}

      {tab === "usuarios" && <UsersTab marcaId={id} t={t} />}
      {tab === "extrato" && <LedgerTab marcaId={id} t={t} intl={intl} />}
      {tab === "pagamentos" && <PaymentsTab marcaId={id} t={t} intl={intl} />}
      {tab === "anuncios" && <AdsTab marcaId={id} t={t} intl={intl} />}

      {sp.modal === "creditos" && (
        <Modal title={t.admin.lancarCreditos} closeHref={`${base}?aba=extrato`}>
          <LaunchCreditsForm t={t} marcaId={id} closeHref={`${base}?aba=extrato`} />
        </Modal>
      )}
      {sp.modal === "convidar" && (
        <Modal title={t.admin.convidarUsuario} closeHref={`${base}?aba=usuarios`}>
          <InviteUserForm t={t} fixedBrandId={id} closeHref={`${base}?aba=usuarios`} />
        </Modal>
      )}
    </div>
  );
}

async function UsersTab({ marcaId, t }: { marcaId: string; t: Dictionary }) {
  const users = await listUsers(marcaId);
  if (!users.length) return <EmptyState text={t.admin.nenhumUsuario} />;
  return (
    <DataTable head={[t.admin.colNome, t.admin.colEmail, t.admin.colStatus, ""]} rows={users.map((u) => [
      <span key="n" className="font-semibold">{u.nome}</span>, u.email,
      <Badge key="s" tone={u.ativo ? "success" : "neutral"}>{u.ativo ? t.admin.ativo : t.admin.desativado}</Badge>,
      <ToggleUserButton key="a" t={t} id={u.id} ativo={u.ativo} />,
    ])} />
  );
}

async function LedgerTab({ marcaId, t, intl }: { marcaId: string; t: Dictionary; intl: string }) {
  const rows = await listLedger(marcaId);
  if (!rows.length) return <EmptyState text={t.admin.nenhumMovimento} />;
  return (
    <DataTable head={[t.admin.colData, t.admin.colDescricao, t.admin.colItem, t.admin.colQuantidade, t.admin.colSaldoApos]} rows={rows.map((m) => [
      formatDate(m.criadoEm, intl), describe(m, t),
      m.valorPagoCentavos && m.moeda ? formatMoney(m.valorPagoCentavos, m.moeda, intl) : (m.observacao ?? t.admin.vazio),
      <span key="q" className={cn("tabular font-semibold", m.quantidade > 0 && "text-success")}>{signedCredits(m.quantidade)}</span>,
      <span key="s" className="tabular">{m.saldoApos}</span>,
    ])} />
  );
}

async function PaymentsTab({ marcaId, t, intl }: { marcaId: string; t: Dictionary; intl: string }) {
  const rows = await listPayments(marcaId);
  if (!rows.length) return <EmptyState text={t.admin.nenhumPagamento} />;
  return (
    <DataTable head={[t.admin.colData, t.admin.colPacote, t.admin.colCreditos, t.admin.colValor, t.admin.colStatus]} rows={rows.map((p) => [
      formatDate(p.criado_em, intl), p.pacote, <span key="c" className="tabular">{p.creditos}</span>, formatMoney(p.valor_centavos, p.moeda, intl),
      <span key="s" className="flex flex-col items-start gap-1"><Badge tone={PAYMENT_TONE[p.status]}>{t.admin.statusPagamento[p.status]}</Badge>{p.observacao && <span className="text-[12px] text-warning">{p.observacao}</span>}</span>,
    ])} />
  );
}

async function AdsTab({ marcaId, t, intl }: { marcaId: string; t: Dictionary; intl: string }) {
  const rows = await listBrandAds(marcaId);
  if (!rows.length) return <EmptyState text={t.admin.nenhumAnuncio} />;
  return (
    <DataTable head={[t.admin.colAnuncio, t.admin.colCriadoEm, t.admin.colStatus]} rows={rows.map((a) => [
      <span key="t" className="font-semibold">{a.titulo}</span>, formatDate(a.criado_em, intl),
      <Badge key="s" tone={AD_TONE[a.status]}>{t.admin.statusAnuncio[a.status]}</Badge>,
    ])} />
  );
}
