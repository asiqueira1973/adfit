import "server-only";
import { higgsfieldEnv } from "../env";
import { normalizeResult, type Downloader, type GenerationClient, type HfResult } from "./types";

const BASE_URL = "https://api.higgsfield.ai";

/** No máximo 10 submissões simultâneas por instância (seção 21; a chave aceita 20). */
const MAX_CONCURRENT = 10;
let active = 0;
const waiting: Array<() => void> = [];

/** Semáforo simples: espera vaga, executa, libera. */
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

/** Erro técnico da Higgsfield (HTTP fora de 2xx). Nunca leva a chave nem URLs assinadas. */
export class HiggsfieldError extends Error {
  constructor(public readonly status: number, detail: string) {
    super(`higgsfield_http_${status}: ${detail.slice(0, 200)}`);
  }
}

/**
 * Cliente HTTP real da Higgsfield API (seção 4.3): `Authorization: Key <id>:<secret>`, só no servidor.
 * Recebe: nada (lê higgsfieldEnv). Devolve: GenerationClient.
 */
export function createHiggsfieldClient(): GenerationClient {
  const env = higgsfieldEnv();
  const headers = { Authorization: `Key ${env.HF_API_KEY_ID}:${env.HF_API_KEY_SECRET}`, "Content-Type": "application/json" };

  async function call(path: string, init: RequestInit): Promise<unknown> {
    const res = await fetch(`${BASE_URL}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
    const text = await res.text();
    if (!res.ok) throw new HiggsfieldError(res.status, text);
    return text ? JSON.parse(text) : null;
  }

  return {
    submit: (endpoint, body, webhookUrl) =>
      withSlot(async () => {
        const qs = webhookUrl ? `?hf_webhook=${encodeURIComponent(webhookUrl)}` : "";
        const data = (await call(`/${endpoint}${qs}`, { method: "POST", body: JSON.stringify(body) })) as { request_id?: string };
        if (!data?.request_id) throw new HiggsfieldError(502, "resposta sem request_id");
        return { request_id: data.request_id };
      }),

    status: async (requestId): Promise<HfResult> => {
      const data = await call(`/requests/${encodeURIComponent(requestId)}/status`, { method: "GET" });
      const result = normalizeResult(data);
      if (!result) throw new HiggsfieldError(502, "status em formato inesperado");
      return result;
    },

    uploadInput: async (bytes, contentType) => {
      const data = (await call("/files/generate-upload-url", { method: "POST", body: JSON.stringify({ content_type: contentType }) })) as {
        public_url: string;
        upload_url: string;
        upload_headers?: Record<string, string>;
      };
      const put = await fetch(data.upload_url, { method: "PUT", headers: data.upload_headers ?? { "Content-Type": contentType }, body: bytes as BodyInit });
      if (!put.ok) throw new HiggsfieldError(put.status, "falha no upload da entrada");
      return data.public_url;
    },
  };
}

/** Download do resultado temporário da Higgsfield (seção 4.3: copiar imediatamente para o Storage). */
export const downloadResult: Downloader = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new HiggsfieldError(res.status, "falha ao baixar resultado");
  return { bytes: new Uint8Array(await res.arrayBuffer()), contentType: res.headers.get("content-type") ?? "image/png" };
};
