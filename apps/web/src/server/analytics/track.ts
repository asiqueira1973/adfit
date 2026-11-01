import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "../db/supabase";
import { runLater } from "../ads/runtime";

/**
 * Eventos de produto enviados ao Visão de Produto (emenda MD-8). Nomes com prefixo `adfit_`.
 * `cliente`: os que o navegador pode pedir por `POST /api/eventos` (lista fechada).
 */
export const CLIENT_EVENTS = ["adfit_login", "adfit_produto_criado"] as const;
export type ClientEvent = (typeof CLIENT_EVENTS)[number];
export type EventName =
  | ClientEvent
  | "adfit_ficha_solicitada"
  | "adfit_ficha_aprovada"
  | "adfit_anuncio_criado"
  | "adfit_anuncio_cenas_prontas"
  | "adfit_anuncio_falhou"
  | "adfit_compra_iniciada"
  | "adfit_compra_concluida"
  | "adfit_feedback_enviado"
  | "adfit_convite_enviado"
  | "adfit_video_solicitado"
  | "adfit_video_pronto"
  | "adfit_video_baixado"
  | "adfit_convite_pedido";

export type ProductEvent = {
  nome: EventName;
  /** Quem fez: o e-mail da pessoa (identifica o mesmo usuário entre sessões). */
  distinctId: string;
  tela: string;
  descricao: string;
  propriedades?: Record<string, string | number | boolean | null>;
  /** Id do evento; passe um id estável quando o mesmo fato pode ser processado duas vezes. */
  id?: string;
};

const ENDPOINT = "https://api.visaodeproduto.com.br/functions/v1/ingest";

/**
 * Envia um evento ao Visão de Produto SEM atrasar nem quebrar a ação do usuário: roda depois da
 * resposta (`after`), com timeout de 4 s, e qualquer erro só vai para o log. Sem `VISAO_API_KEY`
 * (ou nos testes), não envia nada. Nunca manda prompt, URL assinada nem dado de pagamento além de
 * valor e moeda. Recebe: o evento. Devolve: nada.
 */
export async function track(event: ProductEvent): Promise<void> {
  const key = process.env.VISAO_API_KEY;
  if (!key || process.env.VITEST || !event.distinctId) return;
  const body = {
    eventos: [
      {
        id: event.id ?? randomUUID(),
        nome: event.nome,
        distinct_id: event.distinctId.toLowerCase(),
        ocorrido_em: new Date().toISOString(),
        tela: event.tela,
        descricao: event.descricao,
        propriedades: { ambiente: process.env.VERCEL_ENV ?? "local", ...(event.propriedades ?? {}) },
      },
    ],
  };
  await runLater(async () => {
    try {
      const res = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json", "x-api-key": key }, body: JSON.stringify(body), signal: AbortSignal.timeout(4000) });
      if (!res.ok) console.error(`Visão de Produto recusou ${event.nome}:`, res.status);
    } catch (e) {
      console.error(`Visão de Produto indisponível (${event.nome}):`, e instanceof Error ? e.message : e);
    }
  });
}

/** E-mail de um perfil (para eventos que acontecem em segundo plano, sem sessão). */
export async function emailOf(perfilId: string | null | undefined): Promise<string | null> {
  if (!perfilId) return null;
  const { data } = await createAdminClient().from("perfis").select("email").eq("id", perfilId).maybeSingle();
  return data?.email ?? null;
}
