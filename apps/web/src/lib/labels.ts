/**
 * Rótulos em português para os enums da seção 7.2 exibidos na interface (seção 11.4).
 * Os valores (chaves) são exatamente os do banco.
 */
export const CATEGORIA_LABEL = {
  top: "Top",
  legging: "Legging",
  shorts: "Shorts",
  camiseta: "Camiseta",
  regata: "Regata",
  jaqueta: "Jaqueta",
  conjunto: "Conjunto",
  outro: "Outro",
} as const;

export const GENERO_ALVO_LABEL = { feminino: "Feminino", masculino: "Masculino", unissex: "Unissex" } as const;

export const CENARIO_LABEL = {
  academia: "Academia",
  box_crossfit: "Box de crossfit",
  estudio_funcional: "Estúdio funcional",
  ao_ar_livre_urbano: "Ao ar livre urbano",
  ao_ar_livre_natureza: "Ao ar livre natureza",
  pista_de_corrida: "Pista de corrida",
} as const;

export const MODALIDADE_LABEL = {
  musculacao: "Musculação",
  crossfit: "Crossfit",
  hyrox: "Hyrox",
  corrida: "Corrida",
  funcional: "Funcional",
  yoga_pilates: "Yoga/pilates",
} as const;

export const GENERO_MODELO_LABEL = { mulher: "Mulher", homem: "Homem" } as const;

export const FAIXA_ETARIA_LABEL = { de_20_a_30: "20–30", de_30_a_45: "30–45", acima_de_45: "45+" } as const;

export const ESTILO_LABEL = {
  energetico: "Energético",
  cinematografico: "Cinematográfico",
  lifestyle: "Lifestyle",
} as const;

export const FORMATO_LABEL = {
  vertical_9_16: "Vertical 9:16",
  horizontal_16_9: "Horizontal 16:9",
} as const;

export const FORMATO_HINT = {
  vertical_9_16: "Reels/Stories",
  horizontal_16_9: "Feed e YouTube",
} as const;

/** Papel de cada cena (regra 11.3), usado no título dos cartões. */
export const CENA_PAPEL = { 1: "Gancho", 2: "Peça em ação", 3: "Final" } as const;

export type Cenario = keyof typeof CENARIO_LABEL;
export type Modalidade = keyof typeof MODALIDADE_LABEL;
export type Formato = keyof typeof FORMATO_LABEL;
export type Categoria = keyof typeof CATEGORIA_LABEL;
