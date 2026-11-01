import { describe, expect, it } from "vitest";
import { validateScreenText } from "./text-rules";

describe("validateScreenText (regra 11.7)", () => {
  it("aceita 2 linhas de até 32", () => expect(validateScreenText("Treino pesado pede\nsustentação de verdade")).toBeNull());
  it("recusa 3 linhas", () => expect(validateScreenText("a\nb\nc")).not.toBeNull());
  it("recusa linha com 33", () => expect(validateScreenText("x".repeat(33))).not.toBeNull());
  it("recusa emoji", () => expect(validateScreenText("Bora treinar 💪")).not.toBeNull());
});
