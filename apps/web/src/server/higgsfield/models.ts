/**
 * Adaptadores por endpoint da Higgsfield (seção 4.2 e emenda MD-4). O endpoint vem de
 * `configuracoes` (nunca fixo no código); aqui só fica como montar o corpo de cada modelo conhecido.
 */

export type ImageRequest = { prompt: string; imageUrls: string[]; aspectRatio: "16:9" | "9:16" };

type ImageAdapter = { maxRefs: number; build: (r: ImageRequest) => Record<string, unknown> };

/** Modelos de edição de imagem com referência suportados (docs.higgsfield.ai, conferido em 01/11/2026). */
const IMAGE_MODELS: Record<string, ImageAdapter> = {
  // Grok Imagine 2.0: até 10 referências; 1k/2k; uma imagem por requisição.
  "xai/grok-imagine-image-2.0": {
    maxRefs: 10,
    build: (r) => ({ prompt: r.prompt, image_urls: r.imageUrls.slice(0, 10), aspect_ratio: r.aspectRatio, resolution: "2k" }),
  },
  // Qwen Image 3 Edit: 1 a 3 referências; 1k/2k. Sem reescrita do prompt (o prompt já é técnico).
  "alibaba/qwen-image-3/edit": {
    maxRefs: 3,
    build: (r) => ({ prompt: r.prompt, image_urls: r.imageUrls.slice(0, 3), aspect_ratio: r.aspectRatio, resolution: "2k", prompt_extend: false, enable_thinking: false }),
  },
};

/** Diz se o endpoint configurado é um modelo de imagem conhecido. */
export function isKnownImageModel(endpoint: string): boolean {
  return endpoint in IMAGE_MODELS;
}

/**
 * Monta o corpo da requisição para o modelo de imagem configurado.
 * Recebe: endpoint e pedido. Devolve: o corpo JSON. Lança `modelo_desconhecido` para endpoint sem adaptador.
 */
export function buildImageBody(endpoint: string, request: ImageRequest): Record<string, unknown> {
  const adapter = IMAGE_MODELS[endpoint];
  if (!adapter) throw new Error(`modelo_desconhecido:${endpoint}`);
  if (!request.imageUrls.length) throw new Error("sem_referencias");
  return adapter.build(request);
}

export type VideoRequest = { prompt: string; imageUrl: string; seconds: 5 };

/** Modelos de image-to-video suportados (MD-4: Seedance 2.5 padrão; Kling 3.0 Pro alternativa). Seedance com som ambiente (MD-11; mesmo preço). */
const VIDEO_MODELS: Record<string, (r: VideoRequest) => Record<string, unknown>> = {
  // Seedance 2.5: proporção segue a imagem de entrada; 1080p; sem áudio (o vídeo final é mudo, A-4).
  "bytedance/seedance-2.5/image-to-video": (r) => ({ prompt: r.prompt, image_url: r.imageUrl, duration: r.seconds, resolution: "1080p", generate_audio: true }),
  // Kling 3.0 Pro: proporção segue a imagem; sem som.
  "kling-video/v3.0/pro/image-to-video": (r) => ({ prompt: r.prompt, image_url: r.imageUrl, duration: r.seconds, sound: "off" }),
};

/**
 * Monta o corpo do clipe (image-to-video) para o modelo configurado em `modelo_video`.
 * Recebe: endpoint e pedido. Devolve: corpo JSON. Lança `modelo_desconhecido` sem adaptador.
 */
export function buildVideoBody(endpoint: string, request: VideoRequest): Record<string, unknown> {
  const build = VIDEO_MODELS[endpoint];
  if (!build) throw new Error(`modelo_desconhecido:${endpoint}`);
  return build(request);
}
