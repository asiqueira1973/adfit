import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { anthropicEnv } from "../env";
import { readConfig } from "../config";
import { loadPrompt } from "../prompts";
import { adjustedPromptSchema, type AdjustInput, type PromptAdjuster } from "./types";

/** Ferramenta do Anexo C.3: o Claude devolve o prompt ajustado e o resumo para o lojista. */
const SAVE_PROMPT_TOOL = {
  name: "salvar_prompt",
  description: "Salva o prompt técnico ajustado (em inglês) e um resumo curto em português do que mudou.",
  input_schema: {
    type: "object" as const,
    properties: {
      prompt: { type: "string", description: "Prompt técnico ajustado, em inglês." },
      resumo_pt: { type: "string", description: "O que mudou, em até 80 caracteres, para mostrar ao lojista." },
    },
    required: ["prompt", "resumo_pt"],
  },
};

/** Monta a mensagem do usuário com as entradas do C.3. */
function userMessage(input: AdjustInput): string {
  return [
    `tipo: ${input.tipo}`,
    `prompt atual:\n${input.promptAtual}`,
    `pedido do lojista: ${input.pedido.trim() || "(vazio)"}`,
    input.motivoQc ? `motivo da reprovação do controle de qualidade: ${input.motivoQc}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Cliente real do Claude para o Anexo C.3 (seções 4.2 e 8.4/8.6): tool use forçado em
 * `salvar_prompt`, validação Zod e 2 tentativas (resposta fora do schema conta como falha).
 * Modelo de `configuracoes.modelo_claude_roteiro` (MD-3). Recebe: nada. Devolve: PromptAdjuster.
 */
export function createClaudeAdjuster(): PromptAdjuster {
  const client = new Anthropic({ apiKey: anthropicEnv().ANTHROPIC_API_KEY, maxRetries: 1 });
  return {
    async adjustPrompt(input) {
      const { modelo_claude_roteiro } = await readConfig(["modelo_claude_roteiro"]);
      const system = loadPrompt("refacao").texto;
      let lastError: unknown;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await client.messages.create({
            model: String(modelo_claude_roteiro),
            max_tokens: 2000,
            system,
            tools: [SAVE_PROMPT_TOOL],
            tool_choice: { type: "tool", name: "salvar_prompt" },
            messages: [{ role: "user", content: userMessage(input) }],
          });
          const block = response.content.find((b) => b.type === "tool_use");
          const parsed = adjustedPromptSchema.safeParse(block && "input" in block ? block.input : null);
          if (parsed.success) return parsed.data;
          lastError = new Error("claude_fora_do_schema");
        } catch (e) {
          lastError = e;
        }
      }
      throw lastError instanceof Error ? lastError : new Error("claude_falhou");
    },
  };
}
