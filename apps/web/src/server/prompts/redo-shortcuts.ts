import { z } from "zod";
import { REDO_SHORTCUTS, type RedoKind, type RedoShortcut } from "@/lib/redo-shortcuts";

/** Linha fixa (inglês) de cada atalho — entra no prompt sem passar pela interpretação do Claude. */
const LINES: Record<RedoShortcut, string> = {
  cor: "Match the garment color exactly to the reference (hue and shade).",
  logo: "Reproduce the brand mark exactly as in the reference (shape, size, color and position); if the reference shows no outside brand mark, show none.",
  texto_extra: "Remove any text, label, tag or mark that is not printed on the outside of the real garment; never move it elsewhere.",
  modelagem: "Match the cut exactly as in the reference: straps, neckline, length, seams and cut-outs.",
  roupa: "The garment must match the reference sheet exactly; do not alter its cut, color or details.",
  defeito_pessoa: "Natural, anatomically correct hands, face and limbs.",
  pose: "Use a different natural athletic pose and a clean framing that shows the whole garment.",
  roupa_muda: "Keep the garment perfectly stable for the whole shot; use controlled movements so the clothing never morphs.",
  movimento: "Realistic, natural human motion with believable physics; no exaggerated or artificial movement.",
  parado: "More energy: two clear consecutive actions and a dynamic camera move.",
};

/**
 * Corpo das rotas de refação: instrução livre opcional (≤ 200) e atalhos do tipo (≤ 4).
 * Recebe: tipo. Devolve: schema Zod estrito.
 */
export function redoBodySchema(kind: RedoKind) {
  const codes = REDO_SHORTCUTS[kind] as unknown as [string, ...string[]];
  return z.object({ instrucao: z.string().max(200).optional(), atalhos: z.array(z.enum(codes)).max(4).optional() }).strict();
}

/**
 * Junta atalhos e texto livre de uma refação. Recebe: tipo, códigos e texto do lojista.
 * Devolve: `pedido` para o Claude (refacao.v2), `linhas` fixas que o código acrescenta ao prompt e
 * `registro` gravado em `instrucao_refacao` (histórico).
 */
export function buildRedoRequest(kind: RedoKind, atalhos: readonly string[] | undefined, instrucao: string | undefined) {
  const codes = [...new Set(atalhos ?? [])].filter((c): c is RedoShortcut => (REDO_SHORTCUTS[kind] as readonly string[]).includes(c));
  const linhas = codes.map((c) => LINES[c]);
  const texto = (instrucao ?? "").trim();
  const pedido = [linhas.length ? `atalhos: ${linhas.join(" ")}` : null, texto ? `texto do lojista: ${texto}` : null].filter(Boolean).join("\n");
  const registro = [codes.length ? `[${codes.join(", ")}]` : null, texto || null].filter(Boolean).join(" ");
  return { pedido, linhas, registro };
}

/** Acrescenta as linhas fixas ao fim do prompt ajustado, sem repetir as que já estão lá. */
export function appendShortcutLines(prompt: string, linhas: string[]): string {
  const missing = linhas.filter((l) => !prompt.includes(l));
  return missing.length ? `${prompt.trimEnd()}\n${missing.join("\n")}` : prompt;
}

/** Entrada de refação aceita pelos serviços: texto (compatível com chamadas antigas) ou texto + atalhos. */
export type RedoInput = string | { instrucao?: string; atalhos?: string[] } | undefined;

/** Normaliza a entrada de refação do tipo. Recebe: tipo e entrada. Devolve: o mesmo que `buildRedoRequest`. */
export function redoRequest(kind: RedoKind, input: RedoInput) {
  return typeof input === "object" && input ? buildRedoRequest(kind, input.atalhos, input.instrucao) : buildRedoRequest(kind, [], input);
}
