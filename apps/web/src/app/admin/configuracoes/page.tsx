import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/table";
import { NewPackageForm, PricesForm, SettingsForm, TogglePackageButton } from "@/features/admin/settings-forms";
import { formatMoney } from "@/lib/format";
import { adminContext } from "@/server/admin/context";
import { getSettings, listPackagesForAdmin } from "@/server/admin/settings";

const ORDER = ["gerar_ficha", "refazer_ficha", "gerar_roteiro_quadros", "refazer_quadro", "gerar_video", "refazer_clipe", "remontar_texto"];

/**
 * Tela [Admin] Configurações (seção 10; critério 8.9): preços por ação (editáveis), pacotes de
 * créditos (lista, "Novo pacote" com validação do Price na Stripe, ativar/desativar) e as chaves
 * da regra 11.6. `?modal=novo-pacote`.
 */
export default function AdminSettingsPage({ searchParams }: PageProps<"/admin/configuracoes">) {
  return (
    <Suspense fallback={<div className="h-60 animate-pulse rounded-[14px] bg-surface" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/configuracoes">["searchParams"] }) {
  const { t, intl } = await adminContext();
  const { modal } = await searchParams;
  const [packages, settings] = await Promise.all([listPackagesForAdmin(), getSettings()]);
  const prices = [...settings.precos].sort((a, b) => ORDER.indexOf(a.acao) - ORDER.indexOf(b.acao));
  return (
    <div className="flex flex-col gap-10">
      <PageHeader title={t.config.titulo} />

      <section className="flex flex-col gap-3">
        <h2 className="text-[22px] font-bold tracking-tight">{t.config.precos}</h2>
        <PricesForm t={t} prices={prices} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] font-bold tracking-tight">{t.config.pacotes}</h2>
          <ButtonLink href="?modal=novo-pacote" variant="secondary" className="px-3"><Plus className="size-4.5" /> {t.config.novoPacote}</ButtonLink>
        </div>
        <DataTable
          head={[t.config.colOrdem, t.config.colNome, t.config.colCreditos, t.config.colPreco, t.config.colPriceId, t.config.colStatus, ""]}
          rows={packages.map((p) => [
            <span key="o" className="tabular">{p.ordem}</span>,
            <span key="n" className="font-semibold">{p.nome}</span>,
            <span key="c" className="tabular">{p.creditos}</span>,
            formatMoney(p.preco_centavos, p.moeda, intl),
            <span key="s" className="font-mono text-[12px]">{p.stripe_price_id}</span>,
            <Badge key="b" tone={p.ativo ? "success" : "neutral"}>{p.ativo ? t.config.ativo : t.config.inativo}</Badge>,
            <TogglePackageButton key="d" t={t} id={p.id} ativo={p.ativo} />,
          ])}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-[22px] font-bold tracking-tight">{t.config.modelos}</h2>
        <SettingsForm t={t} settings={settings.configuracoes} />
      </section>

      {modal === "novo-pacote" && (
        <Modal title={t.config.novoPacote} closeHref="/admin/configuracoes">
          <NewPackageForm t={t} closeHref="/admin/configuracoes" />
        </Modal>
      )}
    </div>
  );
}
