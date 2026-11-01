import { z } from "zod";

/** Saída da ferramenta `salvar_prompt` do Anexo C.3 (refação). */
export const adjustedPromptSchema = z.object({
  prompt: z.string().min(1).max(4000),
  resumo_pt: z.string().min(1).max(80),
});
export type AdjustedPrompt = z.infer<typeof adjustedPromptSchema>;

/** Entrada do C.3: tipo, prompt atual (sem cláusulas fixas), pedido do lojista e motivo do QC. */
export type AdjustInput = { tipo: "ficha" | "quadro" | "clipe"; promptAtual: string; pedido: string; motivoQc?: string | null };

/** Cliente do Claude atrás de interface (seção 22: dublês nos testes). */
export interface PromptAdjuster {
  adjustPrompt(input: AdjustInput): Promise<AdjustedPrompt>;
}
