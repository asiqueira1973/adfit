"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Banner } from "@/components/ui/feedback";
import { SelectField, TextArea, TextField } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { parseMoneyToCents } from "@/lib/money";
import type { Dictionary } from "@/lib/i18n";
import { callApi } from "./api";

type T = Dictionary;

/** Mensagem de erro da API, ou a genérica do idioma. */
function errorText(t: T, mensagem: string): string {
  return mensagem || t.erros.generico;
}

/**
 * Formulário "Nova marca" (tela [Admin] Marcas; critério 8.2 "Criar marca com nome e @").
 * Recebe: dicionário. Faz: POST /api/admin/marcas e abre a marca criada.
 */
export function NewBrandForm({ t }: { t: T }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    start(async () => {
      const r = await callApi<{ id: string }>("POST", "/api/admin/marcas", { nome: f.get("nome"), instagram: f.get("instagram") || null });
      if (r.ok) router.push(`/admin/marcas/${r.data.id}`);
      else setError(errorText(t, r.mensagem));
    });
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <Banner tone="danger">{error}</Banner>}
      <TextField label={t.admin.kitNome} name="nome" required maxLength={80} />
      <TextField label={t.admin.kitInstagram} name="instagram" hint={t.admin.kitInstagramDica} maxLength={31} />
      <Button type="submit" disabled={pending}>{t.admin.criarMarca}</Button>
    </form>
  );
}

export type BrandKit = {
  id: string;
  nome: string;
  instagram: string | null;
  cor_destaque: string | null;
  cta_padrao: string;
  tom_de_voz: string | null;
  idioma_anuncios: "pt_br" | "en";
};

/**
 * Edição do kit pelo admin (aba Kit; critério 8.2 "editar todos os campos do kit").
 * O logo é enviado pela própria marca na tela Marca (épico 8.3). Faz: PATCH /api/admin/marcas/:id.
 */
export function BrandKitEditor({ t, kit, onDone }: { t: T; kit: BrandKit; onDone?: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [idioma, setIdioma] = useState(kit.idioma_anuncios);
  const [pending, start] = useTransition();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    start(async () => {
      const r = await callApi("PATCH", `/api/admin/marcas/${kit.id}`, {
        nome: f.get("nome"),
        instagram: f.get("instagram") || null,
        cor_destaque: f.get("cor_destaque") || null,
        cta_padrao: f.get("cta_padrao"),
        tom_de_voz: f.get("tom_de_voz") || null,
        idioma_anuncios: idioma,
      });
      if (r.ok) {
        router.refresh();
        onDone?.();
      } else setError(errorText(t, r.mensagem));
    });
  }
  return (
    <form onSubmit={submit} className="flex max-w-lg flex-col gap-4">
      {error && <Banner tone="danger">{error}</Banner>}
      <TextField label={t.admin.kitNome} name="nome" defaultValue={kit.nome} required maxLength={80} />
      <TextField label={t.admin.kitInstagram} name="instagram" defaultValue={kit.instagram ?? ""} hint={t.admin.kitInstagramDica} maxLength={31} />
      <TextField label={t.admin.kitCor} name="cor_destaque" defaultValue={kit.cor_destaque ?? ""} placeholder="#C6F432" maxLength={7} />
      <TextField label={t.admin.kitCta} name="cta_padrao" defaultValue={kit.cta_padrao} required maxChars={40} />
      <TextArea label={t.admin.kitTom} name="tom_de_voz" defaultValue={kit.tom_de_voz ?? ""} rows={2} maxChars={200} />
      <Segmented name="idioma_anuncios" label={t.admin.kitIdiomaAnuncios} value={idioma} onChange={(v) => setIdioma(v as "pt_br" | "en")} options={[{ value: "pt_br", label: t.idiomas.pt_br }, { value: "en", label: t.idiomas.en }]} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{t.admin.salvarKit}</Button>
        {onDone && <Button type="button" variant="ghost" onClick={onDone}>{t.admin.cancelar}</Button>}
      </div>
    </form>
  );
}

/** Mostra o kit e alterna para o editor (aba Kit). */
export function BrandKitSection({ t, kit, children }: { t: T; kit: BrandKit; children: ReactNode }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <BrandKitEditor t={t} kit={kit} onDone={() => setEditing(false)} />;
  return (
    <div className="flex flex-col gap-3">
      {children}
      <div><Button variant="secondary" onClick={() => setEditing(true)}>{t.admin.editarKit}</Button></div>
    </div>
  );
}

/**
 * Pausar/reativar marca (seção 6.3; critério 8.2). Faz: PATCH /api/admin/marcas/:id { ativa }.
 */
export function ToggleBrandButton({ t, id, ativa }: { t: T; id: string; ativa: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <span className="flex flex-col gap-1">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => start(async () => {
          const r = await callApi("PATCH", `/api/admin/marcas/${id}`, { ativa: !ativa });
          if (r.ok) router.refresh();
          else setError(errorText(t, r.mensagem));
        })}
      >
        {ativa ? t.admin.pausarMarca : t.admin.reativarMarca}
      </Button>
      {error && <span role="alert" className="text-[12px] text-danger">{error}</span>}
    </span>
  );
}

/**
 * Desativar/reativar usuário (seção 6.3; critério 8.2). Faz: PATCH /api/admin/usuarios/:id { ativo }.
 */
export function ToggleUserButton({ t, id, ativo, disabled }: { t: T; id: string; ativo: boolean; disabled?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <span className="flex flex-col items-start gap-1">
      <Button
        variant="ghost"
        className="min-h-9 text-[13px]"
        disabled={pending || disabled}
        onClick={() => start(async () => {
          const r = await callApi("PATCH", `/api/admin/usuarios/${id}`, { ativo: !ativo });
          if (r.ok) router.refresh();
          else setError(errorText(t, r.mensagem));
        })}
      >
        {ativo ? t.admin.desativar : t.admin.reativar}
      </Button>
      {error && <span role="alert" className="text-[12px] text-danger">{error}</span>}
    </span>
  );
}

/**
 * Convidar usuário (seção 6.1; critério 8.2). Recebe: marcas para escolher (ou uma marca fixa) e
 * o link de volta. Faz: POST /api/admin/usuarios e fecha o modal.
 */
export function InviteUserForm({ t, brands, fixedBrandId, closeHref }: { t: T; brands?: Array<{ id: string; nome: string }>; fixedBrandId?: string; closeHref: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    start(async () => {
      const r = await callApi("POST", "/api/admin/usuarios", { nome: f.get("nome"), email: f.get("email"), marca_id: fixedBrandId ?? f.get("marca_id") });
      if (r.ok) {
        router.push(closeHref);
        router.refresh();
      } else setError(errorText(t, r.mensagem));
    });
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <Banner tone="danger">{error}</Banner>}
      <TextField label={t.admin.colNome} name="nome" required maxLength={80} />
      <TextField label={t.admin.colEmail} name="email" type="email" required hint={t.admin.conviteDica} />
      {!fixedBrandId && brands && <SelectField label={t.admin.marcaCampo} name="marca_id" options={brands.map((b) => ({ value: b.id, label: b.nome }))} />}
      <Button type="submit" disabled={pending}>{t.admin.enviarConvite}</Button>
    </form>
  );
}

/**
 * Modal "Lançar créditos" (critério 8.2, regra 11.2.6): compra exige valor pago > 0 e moeda;
 * bônus e ajuste exigem observação; ajuste negativo que deixaria saldo < 0 mostra a mensagem da
 * seção 15 devolvida pela API. Faz: POST /api/admin/creditos.
 */
export function LaunchCreditsForm({ t, marcaId, closeHref }: { t: T; marcaId: string; closeHref: string }) {
  const router = useRouter();
  const [tipo, setTipo] = useState("compra");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const quantidade = Number(f.get("quantidade"));
    const valor = tipo === "compra" ? parseMoneyToCents(String(f.get("valor_pago") ?? "")) : null;
    if (!Number.isInteger(quantidade) || quantidade === 0) return setError(t.erros.quantidadeInvalida);
    if (tipo === "compra" && !valor) return setError(t.erros.compraExigeValor);
    start(async () => {
      const r = await callApi("POST", "/api/admin/creditos", {
        marca_id: marcaId,
        tipo,
        quantidade,
        valor_pago_centavos: valor,
        moeda: tipo === "compra" ? f.get("moeda") : null,
        observacao: f.get("observacao") || null,
      });
      if (r.ok) {
        router.push(closeHref);
        router.refresh();
      } else setError(errorText(t, r.mensagem));
    });
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Segmented name="tipo" label={t.admin.tipo} value={tipo} onChange={(v) => { setTipo(v); setError(undefined); }} options={[{ value: "compra", label: t.admin.tipoCompra }, { value: "bonus", label: t.admin.tipoBonus }, { value: "ajuste_manual", label: t.admin.tipoAjuste }]} />
      <TextField label={t.admin.quantidade} name="quantidade" type="number" inputMode="numeric" step={1} required hint={tipo === "ajuste_manual" ? t.admin.quantidadeDicaAjuste : undefined} />
      {tipo === "compra" && (
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <TextField label={t.admin.valorPago} name="valor_pago" inputMode="decimal" placeholder="0,00" required />
          <SelectField label={t.admin.moeda} name="moeda" defaultValue="brl" options={[{ value: "brl", label: "BRL" }, { value: "usd", label: "USD" }, { value: "eur", label: "EUR" }]} />
        </div>
      )}
      <TextArea label={tipo === "compra" ? t.admin.observacaoOpcional : t.admin.observacaoObrigatoria} name="observacao" rows={2} required={tipo !== "compra"} maxLength={500} />
      {error && <Banner tone="danger">{error}</Banner>}
      <Button type="submit" disabled={pending}>{t.admin.lancar}</Button>
    </form>
  );
}
