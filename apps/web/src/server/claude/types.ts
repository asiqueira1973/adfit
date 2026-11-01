import { z } from "zod";

/** Saída da ferramenta `salvar_prompt` do Anexo C.3 (refação). */
export const adjustedPromptSchema = z.object({
  prompt: z.string().min(1).max(4000),
  resumo_pt: z.string().min(1).max(80),
});
export type AdjustedPrompt = z.infer<typeof adjustedPromptSchema>;

/** Entrada do C.3: tipo, prompt atual (sem cláusulas fixas), pedido do lojista e motivo do QC. */
export type AdjustInput = { tipo: "ficha" | "quadro" | "clipe"; promptAtual: string; pedido: string; motivoQc?: string | null };

/** Uma cena do roteiro (Anexo C.2, schema `salvar_roteiro`). */
const sceneSchema = z.object({
  ordem: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  descricao: z.string().min(1).max(140),
  prompt_quadro: z.string().min(1).max(900),
  prompt_movimento: z.string().min(1).max(400),
  texto_tela: z.string().max(65).nullable(),
});

/**
 * Saída da ferramenta `salvar_roteiro` (Anexo C.2 + `modelo` do roteiro.v2): exatamente 3 cenas
 * com ordens 1, 2 e 3. Resposta fora do schema conta como falha e é retentada (critério 8.5).
 */
export const scriptSchema = z
  .object({
    conceito: z.string().min(1).max(200),
    modelo: z.string().min(1).max(600),
    cenas: z.array(sceneSchema).length(3),
  })
  .refine((s) => [1, 2, 3].every((o) => s.cenas.some((c) => c.ordem === o)), { message: "ordens_1_2_3" });
export type Script = z.infer<typeof scriptSchema>;

/** Saída da ferramenta `salvar_qc` (Anexo C.4). A aprovação é calculada pelo código (regra 11.5). */
export const frameQcSchema = z.object({
  fidelidade_peca: z.number().min(0).max(10),
  logo_visivel_correto: z.number().min(0).max(10),
  anatomia: z.number().min(0).max(10),
  texto_espurio: z.boolean(),
  conteudo_improprio: z.boolean(),
  // C.4 pede ≤ 200 caracteres; o excedente é cortado (texto técnico interno, nunca exibido).
  motivo: z.string().transform((m) => m.slice(0, 200)),
});
export type FrameQc = z.infer<typeof frameQcSchema>;

/** Saída da ferramenta `salvar_revisao_texto` (Anexo C.6 / qc-texto.v2). */
export const textReviewSchema = z.object({
  textos: z.array(
    z.object({
      indice: z.number().int().min(0),
      problema: z.boolean(),
      motivo: z.string().max(300).nullable().optional(),
      sugestao: z.string().max(65).nullable(),
    }),
  ),
});
export type TextReview = z.infer<typeof textReviewSchema>;

/** Imagem enviada ao Claude (base64, já reduzida para o limite da API). */
export type ClaudeImage = { mediaType: "image/jpeg" | "image/png" | "image/webp"; data: string };

/** Entrada do roteiro: system prompt montado (roteiro.v2), imagem da ficha e os dados do anúncio. */
export type ScriptInput = { system: string; ficha: ClaudeImage; dados: Record<string, unknown> };

/** Entrada do QC: system prompt (qc-quadro.v1), ficha e quadro gerado. */
export type FrameQcInput = { system: string; ficha: ClaudeImage; quadro: ClaudeImage };

/**
 * Cliente do Claude atrás de interface (seção 22: dublês nos testes). Cada método usa tool use
 * forçado, validação Zod e 2 tentativas; lança erro técnico se as duas falharem.
 */
export interface PromptAdjuster {
  adjustPrompt(input: AdjustInput): Promise<AdjustedPrompt>;
}

export interface AiClient extends PromptAdjuster {
  writeScript(input: ScriptInput): Promise<Script>;
  checkFrame(input: FrameQcInput): Promise<FrameQc>;
  reviewTexts(input: { system: string; textos: string[] }): Promise<TextReview>;
}
