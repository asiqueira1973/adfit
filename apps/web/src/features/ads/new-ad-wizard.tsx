"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, CostButton } from "@/components/ui/button";
import { ListGroup, ListRow } from "@/components/ui/card";
import { Banner, ProgressBar } from "@/components/ui/feedback";
import { TextArea, TextField } from "@/components/ui/field";
import { OptionCard } from "@/components/ui/option-card";
import { Segmented } from "@/components/ui/segmented";
import { fill } from "@/lib/copy";
import type { Dictionary } from "@/lib/i18n";
import { callApi } from "@/features/admin/api";

/**
 * Deriva o gênero do modelo do gênero-alvo do produto (critério 8.5:
 * feminino→mulher, masculino→homem, unissex→mulher).
 */
export function defaultModelGender(generoAlvo: string): "mulher" | "homem" {
  return generoAlvo === "masculino" ? "homem" : "mulher";
}

type Choices = {
  produto_id: string;
  cenario: string;
  modalidade: string;
  genero_modelo: string;
  faixa_etaria: string;
  observacoes: string;
  estilo: string;
  formato: string;
  com_texto: string;
  texto_oferta: string;
};

export type WizardProduct = { id: string; nome: string; genero_alvo: string; imagem: string | null };

const FALLBACK_IMAGE = "/images/vazio-produtos.jpg";

/**
 * Assistente [Marca] Novo anúncio (seção 10 e critério 8.5): 4 passos + resumo, um assunto por tela,
 * padrões já marcados (academia, musculação, modelo conforme o produto, 20–30, energético, vertical,
 * com texto). "Criar anúncio" chama `POST /api/anuncios` e abre a tela do anúncio.
 * Recebe: produtos com ficha aprovada, preço de `gerar_roteiro_quadros`, produto pré-escolhido e
 * dicionário. Saldo e pausa vêm do BrandStatusProvider (CostButton). Devolve: o assistente.
 */
export function NewAdWizard({
  products,
  price,
  initialProductId,
  t,
}: {
  products: WizardProduct[];
  price: number;
  initialProductId?: string;
  t: Pick<Dictionary, "anuncios" | "opcoes" | "erros">;
}) {
  const router = useRouter();
  const o = t.opcoes;
  const a = t.anuncios;
  const first = products.find((p) => p.id === initialProductId) ?? products[0];
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [c, setC] = useState<Choices>({
    produto_id: first.id,
    cenario: "academia",
    modalidade: "musculacao",
    genero_modelo: defaultModelGender(first.genero_alvo),
    faixa_etaria: "de_20_a_30",
    observacoes: "",
    estilo: "energetico",
    formato: "vertical_9_16",
    com_texto: "sim",
    texto_oferta: "",
  });
  const set = (k: keyof Choices) => (v: string) => setC((prev) => ({ ...prev, [k]: v }));
  const product = products.find((p) => p.id === c.produto_id) ?? first;

  async function create() {
    setBusy(true);
    setError(null);
    const result = await callApi<{ anuncio_id: string }>("POST", "/api/anuncios", {
      produto_id: c.produto_id,
      cenario: c.cenario,
      modalidade: c.modalidade,
      genero_modelo: c.genero_modelo,
      faixa_etaria: c.faixa_etaria,
      estilo: c.estilo,
      formato: c.formato,
      com_texto: c.com_texto === "sim",
      texto_oferta: c.texto_oferta.trim() || undefined,
      observacoes: c.observacoes.trim() || undefined,
    });
    if (!result.ok) {
      setBusy(false);
      setError(result.mensagem || t.erros.generico);
      return;
    }
    router.push(`/anuncios/${result.data.anuncio_id}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-[13px] font-medium text-text-2">
          <span>{step <= 4 ? fill(a.passo, { n: step }) : a.resumo}</span>
        </div>
        <ProgressBar value={(Math.min(step, 4) / 4) * 100} tone="success" />
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">{a.passos[step as 1 | 2 | 3 | 4 | 5]}</h1>
      </div>

      {step === 1 && (
        <div className="grid grid-cols-2 gap-3">
          {products.map((p) => (
            <OptionCard
              key={p.id}
              name="produto"
              value={p.id}
              label={p.nome}
              image={p.imagem ?? FALLBACK_IMAGE}
              checked={c.produto_id === p.id}
              onChange={(v) => {
                set("produto_id")(v);
                set("genero_modelo")(defaultModelGender(p.genero_alvo));
              }}
            />
          ))}
          <p className="col-span-2 text-[13px] text-text-2">{a.soComFicha}</p>
        </div>
      )}

      {step === 2 && (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[17px] font-semibold">{a.onde}</legend>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {Object.entries(o.cenarios).map(([value, label]) => (
                <OptionCard key={value} name="cenario" value={value} label={label} image={`/images/cenarios/${value}.jpg`} checked={c.cenario === value} onChange={set("cenario")} />
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[17px] font-semibold">{a.esporte}</legend>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {Object.entries(o.modalidades).map(([value, label]) => (
                <OptionCard key={value} name="modalidade" value={value} label={label} image={`/images/modalidades/${value}.jpg`} checked={c.modalidade === value} onChange={set("modalidade")} />
              ))}
            </div>
          </fieldset>
        </>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-5">
          <Segmented name="genero_modelo" label={a.modelo} value={c.genero_modelo} onChange={set("genero_modelo")} options={Object.entries(o.generosModelo).map(([value, label]) => ({ value, label }))} />
          <Segmented name="faixa_etaria" label={a.faixaEtaria} value={c.faixa_etaria} onChange={set("faixa_etaria")} options={Object.entries(o.faixasEtarias).map(([value, label]) => ({ value, label }))} />
          <TextArea label={a.observacao} name="observacoes" rows={3} maxChars={200} placeholder={a.observacaoPlaceholder} value={c.observacoes} onChange={(e) => set("observacoes")(e.target.value)} />
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-5">
          <Segmented name="estilo" label={a.estilo} value={c.estilo} onChange={set("estilo")} options={Object.entries(o.estilos).map(([value, label]) => ({ value, label }))} />
          <Segmented
            name="formato"
            label={a.formato}
            value={c.formato}
            onChange={set("formato")}
            options={Object.entries(o.formatos).map(([value, label]) => ({ value, label, hint: o.formatosDica[value as keyof typeof o.formatosDica] }))}
          />
          <Segmented name="com_texto" label={a.textoNaTela} value={c.com_texto} onChange={set("com_texto")} options={[{ value: "sim", label: a.sim }, { value: "nao", label: a.nao }]} />
          <TextField label={a.oferta} name="texto_oferta" maxChars={40} placeholder={a.ofertaPlaceholder} value={c.texto_oferta} onChange={(e) => set("texto_oferta")(e.target.value)} hint={a.ofertaDica} />
        </div>
      )}

      {step === 5 && (
        <div className="flex flex-col gap-5">
          {error && <Banner tone="danger">{error}</Banner>}
          <div className="flex items-center gap-3">
            <div className="relative size-16 overflow-hidden rounded-[10px] bg-surface">
              <Image src={product.imagem ?? FALLBACK_IMAGE} alt="" fill unoptimized sizes="64px" className="object-cover" />
            </div>
            <div className="text-[17px] font-semibold">{product.nome}</div>
          </div>
          <ListGroup>
            {(
              [
                [a.onde, o.cenarios[c.cenario as keyof typeof o.cenarios], 2],
                [a.esporte, o.modalidades[c.modalidade as keyof typeof o.modalidades], 2],
                [a.modelo, `${o.generosModelo[c.genero_modelo as keyof typeof o.generosModelo]} · ${o.faixasEtarias[c.faixa_etaria as keyof typeof o.faixasEtarias]}`, 3],
                [a.estilo, o.estilos[c.estilo as keyof typeof o.estilos], 4],
                [a.formato, o.formatos[c.formato as keyof typeof o.formatos], 4],
                [a.textoNaTela, c.com_texto === "sim" ? a.sim : a.nao, 4],
                [a.oferta, c.texto_oferta || a.semOferta, 4],
              ] as Array<[string, string, number]>
            ).map(([label, value, target]) => (
              <button key={label} type="button" onClick={() => setStep(target)} className="block w-full text-left hover:bg-text/[0.03]">
                <ListRow label={label} value={<span className="flex items-center gap-1">{value}<ChevronRight className="size-4" /></span>} />
              </button>
            ))}
          </ListGroup>
        </div>
      )}

      <div className="sticky bottom-20 z-20 -mx-4 flex gap-2 border-t border-hairline bg-bg/90 px-4 py-3 backdrop-blur-xl md:bottom-0">
        {step > 1 && (
          <Button type="button" variant="secondary" onClick={() => setStep(step - 1)} className="px-3" aria-label={a.voltar} disabled={busy}>
            <ChevronLeft className="size-5" />
          </Button>
        )}
        {step < 5 ? (
          <Button type="button" className="flex-1" onClick={() => setStep(step + 1)}>
            {a.continuar}
          </Button>
        ) : (
          <CostButton label={a.criar} cost={price} balance={0} className="flex-1" disabled={busy} onClick={create} />
        )}
      </div>
    </div>
  );
}
