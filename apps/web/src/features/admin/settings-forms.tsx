"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";
import { SelectField, TextField } from "@/components/ui/field";
import { parseMoneyToCents } from "@/lib/money";
import type { Dictionary } from "@/lib/i18n";
import { callApi } from "./api";

type T = Dictionary;

/**
 * Tabela editável de preço por ação (regra 11.1; PUT /api/admin/configuracoes). Mudança vale só
 * para ações iniciadas depois (11.2.7). Recebe: preços atuais e textos.
 */
export function PricesForm({ t, prices }: { t: T; prices: Array<{ acao: string; creditos: number }> }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string }>();
  const [pending, start] = useTransition();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const precos = prices.map((p) => ({ acao: p.acao, creditos: Number(f.get(p.acao)) }));
    start(async () => {
      const r = await callApi("PUT", "/api/admin/configuracoes", { precos });
      setMsg(r.ok ? { tone: "success", text: t.config.salvo } : { tone: "danger", text: r.mensagem || t.erros.generico });
      if (r.ok) router.refresh();
    });
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-[14px] border border-hairline">
        <table className="w-full min-w-[480px] text-left text-[14px]">
          <thead className="bg-surface text-[12px] font-semibold uppercase tracking-wide text-text-2">
            <tr><th className="px-4 py-2.5">{t.config.colAcao}</th><th className="px-4 py-2.5">{t.config.colDescricao}</th><th className="px-4 py-2.5">{t.config.colCreditos}</th></tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {prices.map((p) => (
              <tr key={p.acao}>
                <td className="px-4 py-3 font-mono text-[12px]">{p.acao}</td>
                <td className="px-4 py-3">{t.admin.acoes[p.acao as keyof T["admin"]["acoes"]]}</td>
                <td className="px-4 py-3"><input aria-label={t.admin.acoes[p.acao as keyof T["admin"]["acoes"]]} name={p.acao} type="number" min={0} step={1} defaultValue={p.creditos} className="tabular w-20 rounded-[8px] border border-hairline bg-bg px-2 py-1.5" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}
      <div><Button type="submit" disabled={pending}>{t.config.salvarPrecos}</Button></div>
    </form>
  );
}

/**
 * Formulário "Novo pacote" (critério 8.9; POST /api/admin/pacotes): nome, créditos, preço, moeda,
 * ID do Price na Stripe e ordem. A rota confere na Stripe se o Price existe e bate.
 */
export function NewPackageForm({ t, closeHref }: { t: T; closeHref: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const preco = parseMoneyToCents(String(f.get("preco") ?? ""));
    if (!preco) return setError(t.erros.validacao);
    start(async () => {
      const r = await callApi("POST", "/api/admin/pacotes", {
        nome: f.get("nome"),
        creditos: Number(f.get("creditos")),
        preco_centavos: preco,
        moeda: f.get("moeda"),
        stripe_price_id: String(f.get("stripe_price_id") ?? "").trim(),
        ordem: Number(f.get("ordem") || 1),
        ativo: true,
      });
      if (r.ok) {
        router.push(closeHref);
        router.refresh();
      } else setError(r.mensagem || t.erros.generico);
    });
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <Banner tone="danger">{error}</Banner>}
      <TextField label={t.config.colNome} name="nome" required maxLength={60} placeholder="Pacote 50" />
      <div className="grid grid-cols-2 gap-3">
        <TextField label={t.config.colCreditos} name="creditos" type="number" min={1} step={1} required />
        <TextField label={t.config.colOrdem} name="ordem" type="number" min={0} step={1} defaultValue={1} />
      </div>
      <div className="grid grid-cols-[1fr_110px] gap-3">
        <TextField label={t.config.colPreco} name="preco" inputMode="decimal" required hint={t.config.precoCentavosDica} />
        <SelectField label={t.admin.moeda} name="moeda" defaultValue="usd" options={[{ value: "usd", label: "USD" }, { value: "brl", label: "BRL" }, { value: "eur", label: "EUR" }]} />
      </div>
      <TextField label={t.config.colPriceId} name="stripe_price_id" required placeholder="price_…" hint={t.config.priceIdDica} />
      <Button type="submit" disabled={pending}>{t.config.criarPacote}</Button>
    </form>
  );
}

/** Ativar/desativar pacote (PATCH /api/admin/pacotes/:id { ativo }); pacote nunca é excluído. */
export function TogglePackageButton({ t, id, ativo }: { t: T; id: string; ativo: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <span className="flex flex-col items-start gap-1">
      <Button variant="ghost" className="min-h-9 text-[13px]" disabled={pending} onClick={() => start(async () => {
        const r = await callApi("PATCH", `/api/admin/pacotes/${id}`, { ativo: !ativo });
        if (r.ok) router.refresh();
        else setError(r.mensagem || t.erros.generico);
      })}>
        {ativo ? t.config.desativar : t.config.ativar}
      </Button>
      {error && <span role="alert" className="text-[12px] text-danger">{error}</span>}
    </span>
  );
}

/**
 * Chaves da regra 11.6 (modelos, preços USD, cotações, contato). Cada valor é JSON (texto entre
 * aspas, número ou objeto), como guardado em `configuracoes.valor`. PUT /api/admin/configuracoes.
 */
export function SettingsForm({ t, settings }: { t: T; settings: Array<{ chave: string; valor: unknown; descricao: string }> }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string }>();
  const [pending, start] = useTransition();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const configuracoes = settings.map((s) => ({ chave: s.chave, valor: JSON.parse(String(f.get(s.chave))) }));
      start(async () => {
        const r = await callApi("PUT", "/api/admin/configuracoes", { configuracoes });
        setMsg(r.ok ? { tone: "success", text: t.config.salvo } : { tone: "danger", text: r.mensagem || t.erros.generico });
        if (r.ok) router.refresh();
      });
    } catch {
      setMsg({ tone: "danger", text: t.config.jsonInvalido });
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        {settings.map((s) => (
          <TextField key={s.chave} label={s.chave} name={s.chave} defaultValue={JSON.stringify(s.valor)} hint={s.descricao} className="[&_input]:font-mono [&_input]:text-[14px]" />
        ))}
      </div>
      {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}
      <div><Button type="submit" disabled={pending}>{t.config.salvarConfig}</Button></div>
    </form>
  );
}
