import "server-only";
import type { AiClient, Script } from "../claude/types";
import { loadPrompt, render } from "../prompts";
import { hasForbiddenTerm } from "@/lib/forbidden-terms";
import { validateScreenText } from "@/lib/text-rules";

/** Rótulos em português para os placeholders do roteiro (o system prompt é em português). */
const FAIXA_PT = { de_20_a_30: "20 a 30 anos", de_30_a_45: "30 a 45 anos", acima_de_45: "mais de 45 anos" } as const;
const FORMATO_PT = { vertical_9_16: "vertical 9:16", horizontal_16_9: "horizontal 16:9" } as const;
const IDIOMA_PT = { pt_br: "português do Brasil", en: "inglês" } as const;

export type ScriptOptions = {
  genero_modelo: "mulher" | "homem";
  faixa_etaria: keyof typeof FAIXA_PT;
  formato: keyof typeof FORMATO_PT;
  tom_de_voz: string | null;
  idioma_texto: keyof typeof IDIOMA_PT;
  idioma_descricao: keyof typeof IDIOMA_PT;
};

/**
 * System prompt do roteiro (roteiro.v2 = Anexo C.2 + emendas aprovadas): placeholders preenchidos
 * pelo código e tabelas C.5 literais. Recebe: escolhas. Devolve: { versao, texto }.
 */
export function buildScriptSystem(o: ScriptOptions): { versao: string; texto: string } {
  const { versao, texto } = loadPrompt("roteiro");
  return {
    versao,
    texto: render(texto, {
      genero_modelo: o.genero_modelo,
      faixa_etaria: FAIXA_PT[o.faixa_etaria],
      formato: FORMATO_PT[o.formato],
      tom_de_voz: o.tom_de_voz?.trim() || "direto, positivo, frases curtas",
      idioma_texto: IDIOMA_PT[o.idioma_texto],
      idioma_descricao: IDIOMA_PT[o.idioma_descricao],
      tabela_modalidades: `\n${loadPrompt("tabelaModalidades").texto}\n`,
      tabela_estilos: `\n${loadPrompt("tabelaEstilos").texto}\n`,
    }),
  };
}

/**
 * Quebra um texto em até 2 linhas de 32 caracteres pelas palavras (regra 11.7). Recebe: texto.
 * Devolve: o texto com `\n`, ou null se não couber / tiver emoji.
 */
export function fitScreenText(text: string): string | null {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  const lines: string[] = [];
  for (const word of clean.split(" ")) {
    const last = lines.at(-1);
    if (last !== undefined && `${last} ${word}`.length <= 32) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  const out = lines.join("\n");
  return validateScreenText(out) ? null : out;
}

/**
 * Saneamento do texto da tela gerado pelo Claude (seção 20 e regra 11.7, Anexo C.6):
 * 1. `com_texto = false` ou cena 3 → null;
 * 2. regex de termos proibidos: texto que casa é trocado pela `descricao` neutra da cena;
 * 3. revisão `qc-texto` (Claude): problema com sugestão válida → usa a sugestão; sem sugestão
 *    válida → `descricao`; revisão indisponível → mantém o texto já checado pela regex;
 * 4. no fim, tudo cabe em 2×32 e não casa a regex; senão a cena fica sem texto.
 * Recebe: roteiro, se tem texto, idioma e cliente. Devolve: textos por ordem (1..3).
 */
export async function sanitizeScreenTexts(script: Script, comTexto: boolean, idioma: ScriptOptions["idioma_texto"], ai: AiClient): Promise<Record<1 | 2 | 3, string | null>> {
  const out: Record<1 | 2 | 3, string | null> = { 1: null, 2: null, 3: null };
  if (!comTexto) return out;
  const cenas = script.cenas.filter((c) => c.ordem !== 3);
  const fallback = (c: (typeof cenas)[number]) => (hasForbiddenTerm(c.descricao) ? null : fitScreenText(c.descricao));
  const first = cenas.map((c) => (c.texto_tela && !hasForbiddenTerm(c.texto_tela) ? (fitScreenText(c.texto_tela) ?? fallback(c)) : fallback(c)));

  let reviewed = first;
  const toReview = first.filter((t): t is string => !!t);
  if (toReview.length) {
    try {
      const { texto } = loadPrompt("qcTexto");
      const review = await ai.reviewTexts({ system: render(texto, { idioma_texto: IDIOMA_PT[idioma] }), textos: toReview });
      reviewed = first.map((t) => {
        if (!t) return t;
        const r = review.textos.find((x) => x.indice === toReview.indexOf(t));
        if (!r?.problema) return t;
        const sugestao = r.sugestao && !hasForbiddenTerm(r.sugestao) ? fitScreenText(r.sugestao) : null;
        return sugestao ?? fallback(cenas[first.indexOf(t)]);
      });
    } catch (e) {
      console.error("Revisão de texto indisponível:", e instanceof Error ? e.message : e);
    }
  }
  cenas.forEach((c, i) => {
    const t = reviewed[i];
    out[c.ordem] = t && !hasForbiddenTerm(t) && !validateScreenText(t) ? t : null;
  });
  return out;
}
