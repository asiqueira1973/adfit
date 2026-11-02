import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { anthropicEnv } from "../env";
import { readConfig } from "../config";
import { loadPrompt } from "../prompts";
import {
  adjustedPromptSchema,
  characterSchema,
  frameQcSchema,
  scriptSchema,
  textReviewSchema,
  type AdjustInput,
  type AiClient,
  type CharacterDescriber,
  type ClaudeImage,
} from "./types";

type Tool = { name: string; description: string; input_schema: { type: "object"; properties: Record<string, unknown>; required: string[] } };

/** Ferramenta do Anexo C.3: o Claude devolve o prompt ajustado e o resumo para o lojista. */
const SAVE_PROMPT_TOOL: Tool = {
  name: "salvar_prompt",
  description: "Salva o prompt técnico ajustado (em inglês) e um resumo curto em português do que mudou.",
  input_schema: {
    type: "object",
    properties: {
      prompt: { type: "string", description: "Prompt técnico ajustado, em inglês." },
      resumo_pt: { type: "string", description: "O que mudou, em até 80 caracteres, para mostrar ao lojista." },
    },
    required: ["prompt", "resumo_pt"],
  },
};

/** Ferramenta do Anexo C.2 (schema literal + `modelo` do roteiro.v2). */
const SAVE_SCRIPT_TOOL: Tool = {
  name: "salvar_roteiro",
  description: "Salva o roteiro do anúncio de 3 cenas com os prompts técnicos.",
  input_schema: {
    type: "object",
    required: ["conceito", "modelo", "cenas"],
    properties: {
      conceito: { type: "string", maxLength: 200 },
      modelo: { type: "string", maxLength: 600, description: "Descrição única da modelo (inglês), usada nas 3 cenas." },
      cenas: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          required: ["ordem", "descricao", "prompt_quadro", "prompt_movimento", "texto_tela"],
          properties: {
            ordem: { type: "integer", enum: [1, 2, 3] },
            descricao: { type: "string", maxLength: 140 },
            prompt_quadro: { type: "string", maxLength: 900 },
            prompt_movimento: { type: "string", maxLength: 400 },
            texto_tela: { type: ["string", "null"], maxLength: 65 },
          },
        },
      },
    },
  },
};

/** Ferramenta do Anexo C.4. */
const SAVE_QC_TOOL: Tool = {
  name: "salvar_qc",
  description: "Salva a avaliação da imagem gerada comparada com a ficha da peça.",
  input_schema: {
    type: "object",
    required: ["fidelidade_peca", "logo_visivel_correto", "anatomia", "texto_espurio", "conteudo_improprio", "motivo"],
    properties: {
      fidelidade_peca: { type: "number", minimum: 0, maximum: 10 },
      logo_visivel_correto: { type: "number", minimum: 0, maximum: 10 },
      anatomia: { type: "number", minimum: 0, maximum: 10 },
      texto_espurio: { type: "boolean" },
      conteudo_improprio: { type: "boolean" },
      motivo: { type: "string", maxLength: 200 },
    },
  },
};

/** Ferramenta do Anexo C.6 (formato de saída do qc-texto.v2). */
const SAVE_CHARACTER_TOOL: Tool = {
  name: "salvar_personagem",
  description: "Salva a descrição em inglês da aparência fixa da personagem.",
  input_schema: { type: "object", properties: { modelo_en: { type: "string", description: "40 a 90 palavras, em inglês" } }, required: ["modelo_en"] },
};

const SAVE_TEXT_REVIEW_TOOL: Tool = {
  name: "salvar_revisao_texto",
  description: "Salva a revisão de cada texto de tela.",
  input_schema: {
    type: "object",
    required: ["textos"],
    properties: {
      textos: {
        type: "array",
        items: {
          type: "object",
          required: ["indice", "problema", "sugestao"],
          properties: {
            indice: { type: "integer" },
            problema: { type: "boolean" },
            motivo: { type: ["string", "null"] },
            sugestao: { type: ["string", "null"], maxLength: 65 },
          },
        },
      },
    },
  },
};

/** Bloco de imagem da API a partir da imagem base64. */
function imageBlock(img: ClaudeImage) {
  return { type: "image" as const, source: { type: "base64" as const, media_type: img.mediaType, data: img.data } };
}

/**
 * Cliente real do Claude (seção 4.2): tool use forçado, validação Zod e 2 tentativas por chamada
 * (resposta fora do schema conta como falha — critério 8.5). Modelos de `configuracoes` (MD-3).
 * Recebe: nada. Devolve: AiClient.
 */
export function createClaudeClient(): AiClient {
  const client = new Anthropic({ apiKey: anthropicEnv().ANTHROPIC_API_KEY, maxRetries: 1, timeout: 90_000 });

  async function callTool<T>(
    modelKey: "modelo_claude_roteiro" | "modelo_claude_qc" | "modelo_claude_qc_texto",
    system: string,
    content: Anthropic.Messages.ContentBlockParam[],
    tool: Tool,
    schema: z.ZodType<T>,
    maxTokens: number,
  ): Promise<T> {
    const cfg = await readConfig([modelKey]);
    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await client.messages.create({
          model: String(cfg[modelKey]),
          max_tokens: maxTokens,
          system,
          tools: [tool],
          tool_choice: { type: "tool", name: tool.name },
          messages: [{ role: "user", content }],
        });
        const block = response.content.find((b) => b.type === "tool_use");
        const parsed = schema.safeParse(block && "input" in block ? block.input : null);
        if (parsed.success) return parsed.data;
        lastError = new Error(`claude_fora_do_schema: ${parsed.error.issues.map((i) => i.path.join(".")).join(",")}`);
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("claude_falhou");
  }

  return {
    adjustPrompt: (input: AdjustInput) =>
      callTool(
        "modelo_claude_roteiro",
        loadPrompt("refacao").texto,
        [
          {
            type: "text",
            text: [
              `tipo: ${input.tipo}`,
              `prompt atual:\n${input.promptAtual}`,
              `pedido do lojista: ${input.pedido.trim() || "(vazio)"}`,
              input.motivoQc ? `motivo da reprovação do controle de qualidade: ${input.motivoQc}` : null,
            ]
              .filter(Boolean)
              .join("\n\n"),
          },
        ],
        SAVE_PROMPT_TOOL,
        adjustedPromptSchema,
        2000,
      ),

    writeScript: (input) =>
      callTool(
        "modelo_claude_roteiro",
        input.system,
        [imageBlock(input.ficha), { type: "text", text: `Ficha da peça acima. Dados do anúncio (JSON):\n${JSON.stringify(input.dados, null, 2)}` }],
        SAVE_SCRIPT_TOOL,
        scriptSchema,
        4000,
      ),

    checkFrame: (input) =>
      callTool(
        "modelo_claude_qc",
        input.system,
        [{ type: "text", text: "FICHA DA PEÇA:" }, imageBlock(input.ficha), { type: "text", text: "IMAGEM GERADA:" }, imageBlock(input.quadro)],
        SAVE_QC_TOOL,
        frameQcSchema,
        1000,
      ),

    reviewTexts: (input) =>
      callTool(
        "modelo_claude_qc_texto",
        input.system,
        [{ type: "text", text: input.textos.map((t, i) => `[${i}] ${t}`).join("\n") }],
        SAVE_TEXT_REVIEW_TOOL,
        textReviewSchema,
        1500,
      ),
  };
}

/**
 * Descrição da personagem do catálogo (MD-17): texto do lojista + fotos de referência → `modelo_en`.
 * Mesmo padrão de tool use forçado com validação Zod e 2 tentativas. Recebe: nada. Devolve: CharacterDescriber.
 */
export function createCharacterDescriber(): CharacterDescriber {
  const client = new Anthropic({ apiKey: anthropicEnv().ANTHROPIC_API_KEY, maxRetries: 1, timeout: 90_000 });
  return {
    async describeCharacter(input) {
      const { modelo_claude_roteiro } = await readConfig(["modelo_claude_roteiro"]);
      let lastError: unknown;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await client.messages.create({
            model: String(modelo_claude_roteiro),
            max_tokens: 800,
            system: input.system,
            tools: [SAVE_CHARACTER_TOOL],
            tool_choice: { type: "tool", name: SAVE_CHARACTER_TOOL.name },
            messages: [{ role: "user", content: [...input.fotos.map(imageBlock), { type: "text", text: `Dados (JSON):\n${JSON.stringify(input.dados, null, 2)}` }] }],
          });
          const block = response.content.find((b) => b.type === "tool_use");
          const parsed = characterSchema.safeParse(block && "input" in block ? block.input : null);
          if (parsed.success) return parsed.data;
          lastError = new Error("claude_fora_do_schema: modelo_en");
        } catch (e) {
          lastError = e;
        }
      }
      throw lastError instanceof Error ? lastError : new Error("claude_falhou");
    },
  };
}

/** Compatibilidade com o 8.4: o ajustador de prompt é o mesmo cliente. */
export const createClaudeAdjuster = createClaudeClient;
