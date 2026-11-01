import { createHmac } from "node:crypto";

/**
 * Cabeçalhos Standard Webhooks como a Higgsfield envia (D-16), assinados com `HF_WEBHOOK_SECRET`
 * do ambiente — sem segredo configurado, devolve cabeçalhos vazios (o webhook só exige o token).
 * Recebe: corpo bruto. Devolve: Headers.
 */
export function higgsfieldHeaders(body: string): Headers {
  const secret = process.env.HF_WEBHOOK_SECRET;
  if (!secret) return new Headers();
  const id = `msg_${Math.random().toString(36).slice(2)}`;
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", Buffer.from(secret.replace(/^whsec_/, ""), "base64")).update(`${id}.${ts}.${body}`).digest("base64");
  return new Headers({ "webhook-id": id, "webhook-timestamp": ts, "webhook-signature": `v1,${sig}` });
}
