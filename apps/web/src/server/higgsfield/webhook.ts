import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { higgsfieldEnv } from "../env";
import { applyResult, getGenerationByRequestId } from "./process";
import { normalizeResult } from "./types";

/** Comparação em tempo constante (seção 20: token do webhook). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/**
 * Confere a assinatura Standard Webhooks da Higgsfield (MD-4, D-16): HMAC-SHA256 de
 * `<webhook-id>.<webhook-timestamp>.<corpo>` com o segredo `whsec_` (base64), cabeçalho
 * `webhook-signature` = "v1,<base64>" (pode ter várias, separadas por espaço); timestamp ±5 min.
 * Recebe: segredo, cabeçalhos e corpo bruto. Devolve: true se alguma assinatura confere.
 */
export function verifySignature(secret: string, headers: Headers, body: string, now = Date.now()): boolean {
  const id = headers.get("webhook-id");
  const ts = headers.get("webhook-timestamp");
  const sigs = headers.get("webhook-signature");
  if (!id || !ts || !sigs) return false;
  if (Math.abs(now / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
  return sigs.split(" ").some((s) => {
    const [version, value] = s.split(",");
    return version === "v1" && !!value && safeEqual(value, expected);
  });
}

export type WebhookOutcome = { status: number; body: Record<string, unknown> };

/**
 * POST /api/webhooks/higgsfield?token= (seção 13). Valida o token (tempo constante) e, se
 * `HF_WEBHOOK_SECRET` existir, a assinatura; acha a geração pelo `request_id` e aplica o resultado.
 * Idempotente por `request_id` (reenvio não duplica efeito). Erro ao copiar o arquivo → 500, e a
 * Higgsfield reenvia (5xx são reenviados por até 2 h). Log sem URLs nem payload (seção 20).
 * Recebe: token da query, cabeçalhos e corpo bruto. Devolve: status HTTP e corpo.
 */
export async function handleHiggsfieldWebhook(token: string | null, headers: Headers, rawBody: string): Promise<WebhookOutcome> {
  const env = higgsfieldEnv();
  if (!token || !safeEqual(token, env.HF_WEBHOOK_TOKEN)) return { status: 401, body: { erro: "token_invalido" } };
  if (env.HF_WEBHOOK_SECRET && !verifySignature(env.HF_WEBHOOK_SECRET, headers, rawBody)) {
    return { status: 401, body: { erro: "assinatura_invalida" } };
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { erro: "payload_invalido" } };
  }
  const result = normalizeResult(json);
  if (!result) return { status: 400, body: { erro: "payload_invalido" } };

  const g = await getGenerationByRequestId(result.request_id);
  if (!g) return { status: 404, body: { erro: "request_id_inexistente" } };

  try {
    await applyResult(g, result);
  } catch (e) {
    console.error(`Webhook Higgsfield (geração ${g.id}, status ${result.status}) falhou:`, e instanceof Error ? e.message : e);
    return { status: 500, body: { erro: "processamento_falhou" } };
  }
  return { status: 200, body: { ok: true } };
}
