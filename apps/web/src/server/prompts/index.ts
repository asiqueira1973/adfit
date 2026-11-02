import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Versão em uso de cada prompt do Anexo C (seção 18: nunca editar um `*.vN.md` — criar `vN+1`
 * e atualizar aqui). A versão usada fica registrada em `geracoes.entrada.prompt_versao`.
 */
export const PROMPT_VERSIONS = {
  // v2 (01/11/2026, aprovado pelo Alexandre): fotos como fonte da verdade, logo copiado das fotos
  // ou painel 3 com o tecido quando não há logo, rugas sem perder textura. v1 fica guardado.
  // v3 (01/11/2026): só a marca visível por fora; etiqueta interna/tamanho nunca vira logo (top "oxer P").
  // v4 (01/11/2026): painéis sem rótulos de texto (o Grok escreveu FRONT/BACK/CLOSE-UP na imagem).
  ficha: "ficha.v4",
  // v2 (01/11/2026): negação remove (nunca muda de lugar — caso "sem logo dentro"), atalhos fixos do código.
  refacao: "refacao.v2",
  // v2 (aprovado em 01/11/2026): mesma modelo nas 3 cenas (campo `modelo`) e texto no idioma da marca (MD-1).
  // v3 (aprovado em 01/11/2026, depois do 1º teste real): modelo descrita por ação/postura/roupa, nunca por
  // partes do corpo — "chest slightly lifted" fez a Higgsfield barrar a cena 3 como nsfw duas vezes.
  // v4 (MD-10, 01/11/2026): duas ações por cena e câmera em movimento; a montagem corta cada cena em 2 planos.
  roteiro: "roteiro.v4",
  qcQuadro: "qc-quadro.v1",
  // v2: revisão no idioma do texto (MD-1) e formato de saída explícito.
  qcTexto: "qc-texto.v2",
  // MD-17 (catálogo de personagens): descrição em inglês da personagem e a ficha de personagem.
  personagemDescricao: "personagem-descricao.v1",
  personagem: "personagem.v1",
  tabelaModalidades: "tabela-modalidades.v1",
  tabelaEstilos: "tabela-estilos.v1",
} as const;

export type PromptName = keyof typeof PROMPT_VERSIONS;

const cache = new Map<string, string>();

/**
 * Lê o texto de um prompt versionado de `src/server/prompts/<versão>.md` (incluído no trace pelo
 * next.config). Recebe: nome. Devolve: { versao, texto }.
 */
export function loadPrompt(name: PromptName): { versao: string; texto: string } {
  const versao = PROMPT_VERSIONS[name];
  let texto = cache.get(versao);
  if (texto === undefined) {
    texto = readFileSync(join(process.cwd(), "src/server/prompts", `${versao}.md`), "utf8").trimEnd();
    cache.set(versao, texto);
  }
  return { versao, texto };
}

/**
 * Preenche `{chaves}` de um template. Chave sem valor vira texto vazio; linhas que ficarem vazias
 * por placeholder vazio são removidas. Recebe: template e valores. Devolve: texto final.
 */
export function render(template: string, values: Record<string, string>): string {
  return template
    .split("\n")
    .flatMap((line) => {
      const hadPlaceholder = /\{[a-zA-Z_]+\}/.test(line);
      const out = line.replace(/\{([a-zA-Z_]+)\}/g, (_, k: string) => values[k] ?? "");
      return hadPlaceholder && out.trim() === "" ? [] : [out];
    })
    .join("\n");
}
