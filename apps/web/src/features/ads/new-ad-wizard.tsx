"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, CostButton } from "@/components/ui/button";
import { ListGroup, ListRow } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/feedback";
import { TextArea, TextField } from "@/components/ui/field";
import { OptionCard } from "@/components/ui/option-card";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/components/ui/cn";
import { fxPrices, fxProducts } from "@/features/fixtures";
import {
  CENARIO_LABEL,
  ESTILO_LABEL,
  FAIXA_ETARIA_LABEL,
  FORMATO_HINT,
  FORMATO_LABEL,
  GENERO_MODELO_LABEL,
  MODALIDADE_LABEL,
} from "@/lib/labels";

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

const STEP_TITLES = ["Qual produto?", "Onde e qual esporte?", "Quem vai vestir?", "Como vai ser o vídeo?", "Confira e crie"];

/**
 * Assistente [Marca] Novo anúncio (seção 10 e critério 8.5): 4 passos + resumo, um assunto por tela,
 * padrões já marcados (academia, musculação, modelo conforme o produto, 20–30, energético, vertical,
 * com texto). Fase de design: não envia; `POST /api/anuncios` entra no épico 8.5.
 * Recebe: passo inicial, saldo e se a marca está pausada. Devolve: o assistente.
 */
export function NewAdWizard({ initialStep = 1, balance, paused }: { initialStep?: number; balance: number; paused: boolean }) {
  const eligible = fxProducts.filter((p) => p.status === "pronto");
  const first = eligible[0];
  const [step, setStep] = useState(initialStep);
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
  const product = eligible.find((p) => p.id === c.produto_id) ?? first;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-[13px] font-medium text-text-2">
          <span>{step <= 4 ? `Passo ${step} de 4` : "Resumo"}</span>
        </div>
        <ProgressBar value={(Math.min(step, 4) / 4) * 100} tone="success" />
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">{STEP_TITLES[step - 1]}</h1>
      </div>

      {step === 1 && (
        <div className="grid grid-cols-2 gap-3">
          {eligible.map((p) => (
            <OptionCard key={p.id} name="produto" value={p.id} label={p.nome} image={p.imagem} checked={c.produto_id === p.id} onChange={(v) => { set("produto_id")(v); set("genero_modelo")(defaultModelGender(p.genero_alvo)); }} />
          ))}
          <p className="col-span-2 text-[13px] text-text-2">Só aparecem produtos com a ficha aprovada.</p>
        </div>
      )}

      {step === 2 && (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[17px] font-semibold">Onde</legend>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {Object.entries(CENARIO_LABEL).map(([value, label]) => (
                <OptionCard key={value} name="cenario" value={value} label={label} image={`/images/cenarios/${value}.jpg`} checked={c.cenario === value} onChange={set("cenario")} />
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[17px] font-semibold">Esporte</legend>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {Object.entries(MODALIDADE_LABEL).map(([value, label]) => (
                <OptionCard key={value} name="modalidade" value={value} label={label} image={`/images/modalidades/${value}.jpg`} checked={c.modalidade === value} onChange={set("modalidade")} />
              ))}
            </div>
          </fieldset>
        </>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-5">
          <Segmented name="genero_modelo" label="Modelo" value={c.genero_modelo} onChange={set("genero_modelo")} options={Object.entries(GENERO_MODELO_LABEL).map(([value, label]) => ({ value, label }))} />
          <Segmented name="faixa_etaria" label="Faixa etária" value={c.faixa_etaria} onChange={set("faixa_etaria")} options={Object.entries(FAIXA_ETARIA_LABEL).map(([value, label]) => ({ value, label }))} />
          <TextArea label="Observação (opcional)" name="observacoes" rows={3} maxChars={200} placeholder="ex.: cabelo cacheado" value={c.observacoes} onChange={(e) => set("observacoes")(e.target.value)} />
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-5">
          <Segmented name="estilo" label="Estilo" value={c.estilo} onChange={set("estilo")} options={Object.entries(ESTILO_LABEL).map(([value, label]) => ({ value, label }))} />
          <Segmented name="formato" label="Formato" value={c.formato} onChange={set("formato")} options={Object.entries(FORMATO_LABEL).map(([value, label]) => ({ value, label, hint: FORMATO_HINT[value as keyof typeof FORMATO_HINT] }))} />
          <Segmented name="com_texto" label="Texto na tela" value={c.com_texto} onChange={set("com_texto")} options={[{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }]} />
          <TextField label="Oferta (opcional)" name="texto_oferta" maxChars={40} placeholder="Ex.: 20% OFF esta semana" value={c.texto_oferta} onChange={(e) => set("texto_oferta")(e.target.value)} hint="Aparece no fim do vídeo, abaixo do botão de compra." />
        </div>
      )}

      {step === 5 && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="relative size-16 overflow-hidden rounded-[10px] bg-surface">
              <Image src={product.imagem} alt="" fill sizes="64px" className="object-cover" />
            </div>
            <div className="text-[17px] font-semibold">{product.nome}</div>
          </div>
          <ListGroup>
            {[
              ["Onde", CENARIO_LABEL[c.cenario as keyof typeof CENARIO_LABEL], 2],
              ["Esporte", MODALIDADE_LABEL[c.modalidade as keyof typeof MODALIDADE_LABEL], 2],
              ["Modelo", `${GENERO_MODELO_LABEL[c.genero_modelo as keyof typeof GENERO_MODELO_LABEL]} · ${FAIXA_ETARIA_LABEL[c.faixa_etaria as keyof typeof FAIXA_ETARIA_LABEL]}`, 3],
              ["Estilo", ESTILO_LABEL[c.estilo as keyof typeof ESTILO_LABEL], 4],
              ["Formato", FORMATO_LABEL[c.formato as keyof typeof FORMATO_LABEL], 4],
              ["Texto na tela", c.com_texto === "sim" ? "Sim" : "Não", 4],
              ["Oferta", c.texto_oferta || "Sem oferta", 4],
            ].map(([label, value, target]) => (
              <button key={String(label)} type="button" onClick={() => setStep(Number(target))} className="block w-full text-left hover:bg-text/[0.03]">
                <ListRow label={label} value={<span className="flex items-center gap-1">{value}<ChevronRight className="size-4" /></span>} />
              </button>
            ))}
          </ListGroup>
        </div>
      )}

      <div className="sticky bottom-20 z-20 -mx-4 flex gap-2 border-t border-hairline bg-bg/90 px-4 py-3 backdrop-blur-xl md:bottom-0">
        {step > 1 && (
          <Button type="button" variant="secondary" onClick={() => setStep(step - 1)} className="px-3" aria-label="Voltar">
            <ChevronLeft className="size-5" />
          </Button>
        )}
        {step < 5 ? (
          <Button type="button" className={cn("flex-1")} onClick={() => setStep(step + 1)}>Continuar</Button>
        ) : (
          <CostButton label="Criar anúncio" cost={fxPrices.gerar_roteiro_quadros} balance={balance} paused={paused} className="flex-1" />
        )}
      </div>
    </div>
  );
}
