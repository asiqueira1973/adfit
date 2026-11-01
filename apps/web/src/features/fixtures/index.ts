/**
 * Dados fictícios da fase de design (plans/design.md). Alimentam as telas até cada
 * épico ligá-las ao banco; cada tela troca a fixture pela consulta real no seu épico.
 * Os preços seguem a regra 11.1 e os pacotes, a proposta da 11.2.9 (a confirmar em 25.1).
 */
import type { Tone } from "@/components/ui/badge";

export const fxBrand = {
  id: "marca-kore",
  nome: "Kore Active",
  instagram: "kore_active",
  logo: null as string | null,
  cor_destaque: "#C6F432",
  cta_padrao: "Compre pelo link da bio",
  tom_de_voz: "motivacional, direto, sem gírias",
  saldo_creditos: 36,
  ativa: true,
};

export const fxUser = { nome: "Rafael Siqueira", email: "rafael@koreactive.com" };
export const fxAdmin = { nome: "Alexandre Siqueira", email: "alexandre@dablab.com" };
export const SUPPORT_CONTACT = "WhatsApp +55 11 90000-0000";

/** Preços por ação da regra 11.1. */
export const fxPrices = {
  gerar_ficha: 2,
  refazer_ficha: 1,
  gerar_roteiro_quadros: 2,
  refazer_quadro: 1,
  gerar_video: 51,
  refazer_clipe: 17,
  remontar_texto: 0,
} as const;

export const fxPriceRows = [
  { acao: "gerar_ficha", descricao: "Gerar ficha do produto", creditos: 2 },
  { acao: "refazer_ficha", descricao: "Refazer ficha", creditos: 1 },
  { acao: "gerar_roteiro_quadros", descricao: "Criar anúncio", creditos: 2 },
  { acao: "refazer_quadro", descricao: "Refazer imagem da cena", creditos: 1 },
  { acao: "gerar_video", descricao: "Gerar vídeo", creditos: 51 },
  { acao: "refazer_clipe", descricao: "Refazer cena em vídeo", creditos: 17 },
  { acao: "remontar_texto", descricao: "Atualizar vídeo", creditos: 0 },
];

export type ProductStatus = "sem_ficha" | "gerando" | "pronto";
export const PRODUCT_BADGE: Record<ProductStatus, { label: string; tone: Tone }> = {
  sem_ficha: { label: "Sem ficha", tone: "neutral" },
  gerando: { label: "Preparando ficha", tone: "processing" },
  pronto: { label: "Pronto para anúncio", tone: "success" },
};

export const fxProducts = [
  { id: "p1", nome: "Top Kore Preto", categoria: "top", genero_alvo: "feminino", status: "pronto" as ProductStatus, imagem: "/fixtures/ficha.jpg", fotos: ["/fixtures/foto-produto.jpg"] },
  { id: "p2", nome: "Legging Kore Grafite", categoria: "legging", genero_alvo: "feminino", status: "sem_ficha" as ProductStatus, imagem: "/images/vazio-produtos.jpg", fotos: ["/images/vazio-produtos.jpg"] },
  { id: "p3", nome: "Regata Dry Masculina", categoria: "regata", genero_alvo: "masculino", status: "gerando" as ProductStatus, imagem: "/fixtures/foto-produto.jpg", fotos: ["/fixtures/foto-produto.jpg"] },
];

export type AdStatus = "gerando_roteiro" | "gerando_quadros" | "aguardando_aprovacao" | "gerando_clipes" | "montando" | "pronto" | "falhou";
export const AD_BADGE: Record<AdStatus, { label: string; tone: Tone }> = {
  gerando_roteiro: { label: "Preparando", tone: "processing" },
  gerando_quadros: { label: "Criando cenas", tone: "processing" },
  aguardando_aprovacao: { label: "Escolha as cenas", tone: "warning" },
  gerando_clipes: { label: "Animando", tone: "processing" },
  montando: { label: "Montando vídeo", tone: "processing" },
  pronto: { label: "Pronto", tone: "success" },
  falhou: { label: "Falhou", tone: "danger" },
};

export const fxAds = [
  { id: "a1", titulo: "Top Kore Preto · Academia · 9:16", produto_id: "p1", status: "pronto" as AdStatus, thumb: "/fixtures/cena-3.jpg", criado_em: "2026-10-30T14:05:00Z" },
  { id: "a2", titulo: "Top Kore Preto · Box de crossfit · 9:16", produto_id: "p1", status: "aguardando_aprovacao" as AdStatus, thumb: "/fixtures/cena-2.jpg", criado_em: "2026-10-31T10:20:00Z" },
  { id: "a3", titulo: "Top Kore Preto · Pista de corrida · 16:9", produto_id: "p1", status: "gerando_clipes" as AdStatus, thumb: "/fixtures/cena-1.jpg", criado_em: "2026-10-31T11:00:00Z" },
  { id: "a4", titulo: "Top Kore Preto · Ao ar livre urbano · 9:16", produto_id: "p1", status: "falhou" as AdStatus, thumb: "/images/cenarios/ao_ar_livre_urbano.jpg", criado_em: "2026-10-29T09:00:00Z" },
];

export const fxScenes = [
  { ordem: 1 as const, descricao: "Close nas mãos apertando a barra, com o top já aparecendo.", texto_tela: "Treino pesado pede\nsustentação de verdade", imagem: "/fixtures/cena-1.jpg", versoes: 1, qcAviso: false },
  { ordem: 2 as const, descricao: "Agachamento livre mostrando o top inteiro e o logo.", texto_tela: "Não sobe, não marca,\nnão sai do lugar", imagem: "/fixtures/cena-2.jpg", versoes: 2, qcAviso: true },
  { ordem: 3 as const, descricao: "Modelo em pose de confiança depois da série.", texto_tela: null, imagem: "/fixtures/cena-3.jpg", versoes: 1, qcAviso: false },
];

export const fxLedger = [
  { id: "m1", data: "2026-10-31T11:00:00Z", descricao: "Gerar vídeo", item: "Top Kore Preto · Pista de corrida", href: "/anuncios/a3", quantidade: -12, saldo_apos: 36 },
  { id: "m2", data: "2026-10-31T10:20:00Z", descricao: "Criar anúncio", item: "Top Kore Preto · Box de crossfit", href: "/anuncios/a2", quantidade: -2, saldo_apos: 48 },
  { id: "m3", data: "2026-10-30T15:00:00Z", descricao: "Estorno · Gerar vídeo (cena 2)", item: "Top Kore Preto · Ao ar livre urbano", href: "/anuncios/a4", quantidade: 4, saldo_apos: 50 },
  { id: "m4", data: "2026-10-30T14:30:00Z", descricao: "Gerar vídeo", item: "Top Kore Preto · Ao ar livre urbano", href: "/anuncios/a4", quantidade: -12, saldo_apos: 46 },
  { id: "m5", data: "2026-10-30T14:00:00Z", descricao: "Criar anúncio", item: "Top Kore Preto · Ao ar livre urbano", href: "/anuncios/a4", quantidade: -2, saldo_apos: 58 },
  { id: "m6", data: "2026-10-30T09:12:00Z", descricao: "Compra · Pacote 50", item: "US$ 30,00", href: null as string | null, quantidade: 50, saldo_apos: 60 },
  { id: "m7", data: "2026-10-29T08:00:00Z", descricao: "Gerar ficha do produto", item: "Top Kore Preto", href: "/produtos/p1", quantidade: -2, saldo_apos: 10 },
  { id: "m8", data: "2026-10-28T18:00:00Z", descricao: "Bônus · cortesia do piloto", item: "", href: null, quantidade: 12, saldo_apos: 12 },
];

export const fxPackages = [
  { id: "pk60", nome: "Pacote 60", creditos: 60, preco_centavos: 3600, moeda: "usd", stripe_price_id: "price_1Q…60", ativo: true, ordem: 1 },
  { id: "pk150", nome: "Pacote 150", creditos: 150, preco_centavos: 8100, moeda: "usd", stripe_price_id: "price_1Q…150", ativo: true, ordem: 2 },
];

export type PaymentStatus = "iniciado" | "pago" | "falhou" | "expirado" | "reembolsado";
export const PAYMENT_BADGE: Record<PaymentStatus, { label: string; tone: Tone }> = {
  iniciado: { label: "Iniciado", tone: "processing" },
  pago: { label: "Pago", tone: "success" },
  falhou: { label: "Falhou", tone: "danger" },
  expirado: { label: "Expirado", tone: "neutral" },
  reembolsado: { label: "Reembolsado", tone: "warning" },
};

export const fxPayments = [
  { id: "pg1", data: "2026-10-30T09:10:00Z", pacote: "Pacote 60", creditos: 60, valor_centavos: 3600, moeda: "usd", status: "pago" as PaymentStatus },
  { id: "pg2", data: "2026-10-28T19:40:00Z", pacote: "Pacote 150", creditos: 150, valor_centavos: 8100, moeda: "usd", status: "expirado" as PaymentStatus },
  { id: "pg3", data: "2026-10-28T19:31:00Z", pacote: "Pacote 150", creditos: 150, valor_centavos: 8100, moeda: "usd", status: "falhou" as PaymentStatus },
];

/* ---------- Admin ---------- */
export const fxAdminBrands = [
  { id: "marca-kore", nome: "Kore Active", instagram: "kore_active", saldo: 36, anuncios_mes: 4, ativa: true },
  { id: "marca-demo", nome: "Marca Demo", instagram: null as string | null, saldo: 0, anuncios_mes: 0, ativa: false },
];

export const fxAdminUsers = [
  { id: "u1", nome: "Rafael Siqueira", email: "rafael@koreactive.com", marca: "Kore Active", ativo: true },
  { id: "u2", nome: "Ana Lima", email: "ana@koreactive.com", marca: "Kore Active", ativo: true },
  { id: "u3", nome: "Teste Demo", email: "demo@exemplo.com", marca: "Marca Demo", ativo: false },
];

export type GenStatus = "na_fila" | "processando" | "concluida" | "falhou" | "bloqueada_nsfw";
export const GEN_BADGE: Record<GenStatus, { label: string; tone: Tone }> = {
  na_fila: { label: "Na fila", tone: "neutral" },
  processando: { label: "Processando", tone: "processing" },
  concluida: { label: "Concluída", tone: "success" },
  falhou: { label: "Falhou", tone: "danger" },
  bloqueada_nsfw: { label: "Bloqueada", tone: "danger" },
};
export const GEN_TYPE_LABEL = { ficha_produto: "Ficha", quadro_chave: "Imagem de cena", clipe_video: "Clipe" } as const;

export const fxGenerations = [
  { id: "g1", criado_em: "2026-10-31T11:00:10Z", marca: "Kore Active", tipo: "clipe_video" as const, modelo: "kling-video/v3.0/i2v (a confirmar)", status: "processando" as GenStatus, tentativa: 1, custo_usd: null as number | null, request_id: "req_8f2a…", erro: null as string | null },
  { id: "g2", criado_em: "2026-10-31T10:21:00Z", marca: "Kore Active", tipo: "quadro_chave" as const, modelo: "nano-banana/edit (a confirmar)", status: "concluida" as GenStatus, tentativa: 1, custo_usd: 0.08, request_id: "req_77c1…", erro: null },
  { id: "g3", criado_em: "2026-10-30T14:40:00Z", marca: "Kore Active", tipo: "clipe_video" as const, modelo: "kling-video/v3.0/i2v (a confirmar)", status: "falhou" as GenStatus, tentativa: 2, custo_usd: null, request_id: "req_1b9d…", erro: "failed: upstream timeout" },
  { id: "g4", criado_em: "2026-10-29T08:01:00Z", marca: "Kore Active", tipo: "ficha_produto" as const, modelo: "nano-banana/edit (a confirmar)", status: "concluida" as GenStatus, tentativa: 1, custo_usd: 0.08, request_id: "req_02aa…", erro: null },
];

export const fxCosts = {
  creditos_consumidos: 64,
  custo_usd: 11.42,
  cotacao: 5.5,
  receita_brl: 165,
  anuncios_criados: 4,
  anuncios_prontos: 3,
  creditos_por_anuncio_pronto: 19.3,
};

export const fxSettings = [
  { chave: "modelo_imagem", valor: "(a confirmar — 25.5)", descricao: "Ficha e quadros" },
  { chave: "modelo_video", valor: "(a confirmar — 25.5)", descricao: "Clipes" },
  { chave: "resolucao_video", valor: "1080p", descricao: "Clipes" },
  { chave: "preco_usd_por_segundo_video", valor: "0.112", descricao: "Custo de clipe por segundo" },
  { chave: "preco_usd_por_imagem", valor: "0.08", descricao: "Custo por imagem" },
  { chave: "cotacao_usd_brl", valor: "5.50", descricao: "Painel de custos" },
  { chave: "cotacoes_para_brl", valor: '{"usd": 5.50, "eur": 6.00}', descricao: "Receita em outras moedas" },
  { chave: "modelo_claude_roteiro", valor: "claude-sonnet-5-5", descricao: "Roteiro e refação" },
  { chave: "modelo_claude_qc", valor: "claude-sonnet-5-5", descricao: "Controle de qualidade" },
  { chave: "contato_suporte", valor: "WhatsApp +55 11 90000-0000", descricao: "Mensagens de suporte" },
];
