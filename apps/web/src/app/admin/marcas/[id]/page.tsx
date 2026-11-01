import Link from "next/link";
import { Suspense } from "react";
import { Coins, Pause, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { ListGroup, ListRow } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/feedback";
import { TextField } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/table";
import { cn } from "@/components/ui/cn";
import { LaunchCreditsForm } from "@/features/admin/launch-credits-form";
import { AD_BADGE, fxAdminUsers, fxAds, fxBrand, fxLedger, fxPayments, PAYMENT_BADGE } from "@/features/fixtures";
import { formatDate, formatMoney, signedCredits } from "@/lib/format";

const TABS = [
  ["kit", "Kit"],
  ["usuarios", "Usuários"],
  ["extrato", "Extrato"],
  ["pagamentos", "Pagamentos"],
  ["anuncios", "Anúncios"],
] as const;

/**
 * Tela [Admin] Marca (seção 10): abas Kit, Usuários, Extrato, Pagamentos, Anúncios; ações Editar,
 * Pausar/Reativar, "Lançar créditos" e "Convidar usuário". Estados de design: `?aba=`,
 * `?modal=creditos|convidar`, `?erro=negativo`.
 */
export default function AdminBrandPage({ params, searchParams }: PageProps<"/admin/marcas/[id]">) {
  return (
    <Suspense>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ params, searchParams }: Pick<PageProps<"/admin/marcas/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = typeof sp.aba === "string" ? sp.aba : "kit";
  const base = `/admin/marcas/${id}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={fxBrand.nome}
        subtitle={<span className="flex items-center gap-2">@{fxBrand.instagram} · <span className="tabular">{fxBrand.saldo_creditos} créditos</span> <Badge tone="success">Ativa</Badge></span>}
      />
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={`${base}?aba=${tab}&modal=creditos`}><Coins className="size-4.5" /> Lançar créditos</ButtonLink>
        <ButtonLink href={`${base}?aba=usuarios&modal=convidar`} variant="secondary"><UserPlus className="size-4.5" /> Convidar usuário</ButtonLink>
        <Button variant="secondary"><Pause className="size-4.5" /> Pausar marca</Button>
      </div>

      <nav aria-label="Seções da marca" className="-mx-4 flex gap-1 overflow-x-auto border-b border-hairline px-4 md:mx-0 md:px-0">
        {TABS.map(([key, label]) => (
          <Link key={key} href={`${base}?aba=${key}`} className={cn("flex min-h-11 shrink-0 items-center border-b-2 px-3 text-[14px] font-semibold", tab === key ? "border-text text-text" : "border-transparent text-text-2")}>
            {label}
          </Link>
        ))}
      </nav>

      {tab === "kit" && (
        <ListGroup footer={<Button variant="secondary" className="mt-2">Editar kit</Button>}>
          <ListRow label="Nome" value={fxBrand.nome} />
          <ListRow label="Instagram" value={`@${fxBrand.instagram}`} />
          <ListRow label="Logo" value="Não enviado" />
          <ListRow label="Cor de destaque" value={<span className="flex items-center gap-2"><span className="size-4 rounded-full border border-hairline" style={{ background: fxBrand.cor_destaque }} />{fxBrand.cor_destaque}</span>} />
          <ListRow label="CTA padrão" value={fxBrand.cta_padrao} />
          <ListRow label="Tom de voz" value={fxBrand.tom_de_voz} />
        </ListGroup>
      )}

      {tab === "usuarios" && (
        <DataTable head={["Nome", "E-mail", "Status", ""]} rows={fxAdminUsers.filter((u) => u.marca === fxBrand.nome).map((u) => [
          <span key="n" className="font-semibold">{u.nome}</span>, u.email,
          <Badge key="s" tone={u.ativo ? "success" : "neutral"}>{u.ativo ? "Ativo" : "Desativado"}</Badge>,
          <Button key="a" variant="ghost" className="min-h-9 text-[13px]">{u.ativo ? "Desativar" : "Reativar"}</Button>,
        ])} />
      )}

      {tab === "extrato" && (
        <DataTable head={["Data", "Descrição", "Item", "Quantidade", "Saldo após"]} rows={fxLedger.map((m) => [
          formatDate(m.data), m.descricao, m.item || "—",
          <span key="q" className={cn("tabular font-semibold", m.quantidade > 0 && "text-success")}>{signedCredits(m.quantidade)}</span>,
          <span key="s" className="tabular">{m.saldo_apos}</span>,
        ])} />
      )}

      {tab === "pagamentos" && (
        <DataTable head={["Data", "Pacote", "Créditos", "Valor", "Status"]} rows={fxPayments.map((p) => [
          formatDate(p.data), p.pacote, <span key="c" className="tabular">{p.creditos}</span>, formatMoney(p.valor_centavos, p.moeda),
          <Badge key="s" tone={PAYMENT_BADGE[p.status].tone}>{PAYMENT_BADGE[p.status].label}</Badge>,
        ])} />
      )}

      {tab === "anuncios" && (
        <DataTable head={["Anúncio", "Criado em", "Status"]} rows={fxAds.map((a) => [
          <span key="t" className="font-semibold">{a.titulo}</span>, formatDate(a.criado_em),
          <Badge key="s" tone={AD_BADGE[a.status].tone}>{AD_BADGE[a.status].label}</Badge>,
        ])} />
      )}

      {sp.modal === "creditos" && (
        <Modal title="Lançar créditos" closeHref={`${base}?aba=${tab}`}>
          <LaunchCreditsForm showNegativeError={sp.erro === "negativo"} />
        </Modal>
      )}
      {sp.modal === "convidar" && (
        <Modal title="Convidar usuário" closeHref={`${base}?aba=usuarios`}>
          <form className="flex flex-col gap-4">
            <TextField label="Nome" name="nome" required />
            <TextField label="E-mail" name="email" type="email" required hint="A pessoa recebe um e-mail para criar a senha." />
            <Button type="submit">Enviar convite</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
