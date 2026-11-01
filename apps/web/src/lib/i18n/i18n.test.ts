import { describe, expect, it } from "vitest";
import { en } from "./en";
import { ptBR } from "./pt-br";
import { getDictionary, localeFromAcceptLanguage } from ".";
import { COPY } from "../copy";

/** Lista as chaves de um objeto aninhado como "a.b.c". */
function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => (typeof v === "object" && v ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
}

describe("i18n (MD-1)", () => {
  it("o dicionário em inglês tem exatamente as mesmas chaves do pt-BR", () => {
    expect(keys(en).sort()).toEqual(keys(ptBR).sort());
  });
  it("nenhum texto em inglês ficou vazio", () => {
    expect(keys(en).filter((k) => !k.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], en))).toEqual([]);
  });
  it("placeholders são os mesmos nos dois idiomas", () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const k of Object.keys(ptBR.copy) as Array<keyof typeof ptBR.copy>) expect(ph(en.copy[k]), k).toBe(ph(ptBR.copy[k]));
  });
  it("a copy pt-BR é a da seção 15 (COPY)", () => {
    expect(ptBR.copy).toEqual(COPY);
  });
  it("escolhe idioma pelo navegador", () => {
    expect(localeFromAcceptLanguage("en-US,en;q=0.9,pt;q=0.5")).toBe("en");
    expect(localeFromAcceptLanguage("pt-BR,pt;q=0.9,en;q=0.8")).toBe("pt_br");
    expect(localeFromAcceptLanguage("de-DE,en;q=0.5")).toBe("en");
    expect(localeFromAcceptLanguage("fr-FR")).toBe("pt_br");
    expect(localeFromAcceptLanguage(null)).toBe("pt_br");
  });
  it("idioma desconhecido cai no pt-BR", () => {
    expect(getDictionary("xx")).toBe(ptBR);
    expect(getDictionary("en")).toBe(en);
  });
});
