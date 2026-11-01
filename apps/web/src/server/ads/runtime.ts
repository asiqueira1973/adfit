import "server-only";
import { after } from "next/server";
import { createClaudeClient } from "../claude/client";
import type { AiClient } from "../claude/types";

let testAi: AiClient | null = null;

/** Troca o cliente do Claude nos testes de integração (nunca usado fora de testes). */
export function setAiClientForTests(ai: AiClient | null): void {
  testAi = ai;
}

/** Cliente do Claude em uso: dublê nos testes, o real no resto (seção 22). */
export function aiClient(): AiClient {
  return testAi ?? createClaudeClient();
}

/**
 * Executa trabalho depois da resposta HTTP (`after` do Next): a criação do anúncio responde 202 e o
 * roteiro segue; o webhook da Higgsfield responde em < 10 s e o QC segue. Fora de uma requisição
 * (testes, scripts) executa na hora. Se a função for encerrada no meio, as varreduras de órfãos
 * (`ads/service.ts` refreshAd e `higgsfield/stale.ts`) retomam ou falham com estorno.
 * Recebe: a tarefa. Devolve: nada.
 */
export async function runLater(task: () => Promise<void>): Promise<void> {
  const safe = async () => {
    try {
      await task();
    } catch (e) {
      console.error("Tarefa em segundo plano falhou:", e instanceof Error ? e.message : e);
    }
  };
  if (process.env.VITEST) return safe();
  try {
    after(safe);
  } catch {
    await safe();
  }
}
