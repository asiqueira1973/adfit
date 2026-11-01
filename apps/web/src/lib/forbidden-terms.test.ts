import { describe, expect, it } from "vitest";
import { hasForbiddenTerm } from "./forbidden-terms";

describe("hasForbiddenTerm (seção 20)", () => {
  it.each(["Emagreça treinando", "Perca 5 kg em um mês", "Queima gordura de verdade", "A cura da dor nas costas", "Resultado garantido"])(
    "detecta %s",
    (t) => expect(hasForbiddenTerm(t)).toBe(true),
  );
  it.each(["Sustentação de verdade", "Não sobe, não marca", "Curadoria de peças", null])("aceita %s", (t) => {
    expect(hasForbiddenTerm(t)).toBe(false);
  });
  it("equivalentes em inglês (MD-1)", () => {
    for (const t of ["Lose weight fast", "lose 5 kg", "fat-burning top", "burn fat", "cures back pain", "Guaranteed results"]) {
      expect(hasForbiddenTerm(t)).toBe(true);
    }
    for (const t of ["Feel free to move", "Built for heavy lifts", "Secure fit"]) expect(hasForbiddenTerm(t)).toBe(false);
  });
});
