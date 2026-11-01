import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/feedback";
import { TextField } from "@/components/ui/field";
import { DataTable } from "@/components/ui/table";
import { fxPackages, fxPriceRows, fxSettings } from "@/features/fixtures";
import { formatMoney } from "@/lib/format";

/**
 * Tela [Admin] Configurações (seção 10 e critério 8.9): preços por ação em créditos (editáveis),
 * pacotes de créditos (nome, créditos, preço, moeda, ID do preço na Stripe, ativo, ordem) com
 * "Novo pacote" e desativar, e as chaves da regra 11.6. Ligada a `/api/admin/configuracoes` e
 * `/api/admin/pacotes` nos épicos 8.2/8.9.
 */
export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader title="Configurações" />

      <section className="flex flex-col gap-3">
        <h2 className="text-[22px] font-bold tracking-tight">Preço por ação</h2>
        <DataTable
          head={["Ação", "Descrição", "Créditos"]}
          rows={fxPriceRows.map((p) => [
            <span key="a" className="font-mono text-[12px]">{p.acao}</span>, p.descricao,
            <input key="c" aria-label={`Créditos de ${p.descricao}`} type="number" min={0} defaultValue={p.creditos} className="tabular w-20 rounded-[8px] border border-hairline bg-bg px-2 py-1.5" />,
          ])}
        />
        <div><Button>Salvar preços</Button></div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] font-bold tracking-tight">Pacotes de créditos</h2>
          <Button variant="secondary" className="px-3"><Plus className="size-4.5" /> Novo pacote</Button>
        </div>
        <DataTable
          head={["Ordem", "Nome", "Créditos", "Preço", "ID do preço na Stripe", "Status", ""]}
          rows={fxPackages.map((p) => [
            <span key="o" className="tabular">{p.ordem}</span>, <span key="n" className="font-semibold">{p.nome}</span>,
            <span key="c" className="tabular">{p.creditos}</span>, formatMoney(p.preco_centavos, p.moeda),
            <span key="s" className="font-mono text-[12px]">{p.stripe_price_id}</span>,
            <Badge key="b" tone={p.ativo ? "success" : "neutral"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>,
            <Button key="d" variant="ghost" className="min-h-9 text-[13px]">Desativar</Button>,
          ])}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-[22px] font-bold tracking-tight">Modelos e cotações</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {fxSettings.map((s) => (
            <TextField key={s.chave} label={s.chave} defaultValue={s.valor} hint={s.descricao} className="[&_input]:font-mono [&_input]:text-[14px]" />
          ))}
        </div>
        <div><Button>Salvar configurações</Button></div>
      </section>
    </div>
  );
}
