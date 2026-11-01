import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Versão em uso de cada prompt do Anexo C (seção 18: nunca editar um `*.vN.md` — criar `vN+1`
 * e atualizar aqui). A versão usada fica registrada em `geracoes.entrada.prompt_versao`.
 */
export const PROMPT_VERSIONS = {
  ficha: "ficha.v1",
  refacao: "refacao.v1",
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
