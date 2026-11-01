/**
 * Tipos da integração com a Higgsfield API (seção 4.3). O resto do servidor só conhece esta
 * interface; testes usam dublês com respostas gravadas (seção 22).
 */

/** Status de uma requisição na Higgsfield (docs: requests/get-request-status). */
export type HfStatus = "queued" | "in_progress" | "completed" | "failed" | "nsfw" | "canceled";

/** Resultado normalizado, venha do polling (`status_url`) ou do webhook (envelope com `payload`). */
export type HfResult = {
  request_id: string;
  status: HfStatus;
  error?: string | null;
  images?: Array<{ url: string }>;
  video?: { url: string } | null;
};

/** Cliente da Higgsfield atrás de interface (seção 22: dublês nos testes; seção 23: trocar fornecedor). */
export interface GenerationClient {
  /** Submete uma geração. `webhookUrl` vira o parâmetro de query `hf_webhook`. */
  submit(endpoint: string, body: Record<string, unknown>, webhookUrl?: string): Promise<{ request_id: string }>;
  /** Consulta o status de uma requisição (polling de reserva e "Reconsultar" do admin). */
  status(requestId: string): Promise<HfResult>;
  /** Sobe um arquivo de entrada pela API (`/files/generate-upload-url`) e devolve a URL pública. */
  uploadInput(bytes: Uint8Array, contentType: string): Promise<string>;
}

/** Baixa um resultado (URL temporária da Higgsfield) para copiar ao Storage (seção 4.3). */
export type Downloader = (url: string) => Promise<{ bytes: Uint8Array; contentType: string }>;

/**
 * Normaliza o corpo do webhook (`{ request_id, status, error, payload: { images | video } }`) ou do
 * status (`{ request_id, status, images | video }`) para HfResult. Recebe: JSON. Devolve: HfResult ou null.
 */
export function normalizeResult(raw: unknown): HfResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.request_id !== "string" || typeof r.status !== "string") return null;
  const source = (r.payload && typeof r.payload === "object" ? r.payload : r) as Record<string, unknown>;
  return {
    request_id: r.request_id,
    status: r.status as HfStatus,
    error: typeof r.error === "string" ? r.error : null,
    images: Array.isArray(source.images) ? (source.images as Array<{ url: string }>) : undefined,
    video: source.video && typeof source.video === "object" ? (source.video as { url: string }) : null,
  };
}
