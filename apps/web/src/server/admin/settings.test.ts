import { describe, expect, it } from "vitest";
import { packagePatchSchema, packageSchema } from "./settings";

/** Critério 8.9 ([Admin] Configurações): PATCH parcial não pode inventar campos (ordem, ativo). */
describe("packagePatchSchema", () => {
  it("desativar envia só { ativo: false }", () => {
    expect(packagePatchSchema.parse({ ativo: false })).toEqual({ ativo: false });
  });
  it("editar o nome não reativa nem reordena o pacote", () => {
    expect(packagePatchSchema.parse({ nome: "x" })).toEqual({ nome: "x" });
  });
  it("corpo vazio continua vazio", () => {
    expect(packagePatchSchema.parse({})).toEqual({});
  });
  it("na criação, ativo e ordem têm padrão", () => {
    expect(packageSchema.parse({ nome: "P", creditos: 1, preco_centavos: 100, moeda: "usd", stripe_price_id: "price_x" })).toMatchObject({ ativo: true, ordem: 1 });
  });
});
