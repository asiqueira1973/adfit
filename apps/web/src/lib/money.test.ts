import { describe, expect, it } from "vitest";
import { parseMoneyToCents } from "./money";

describe("parseMoneyToCents (regra 11.2.6)", () => {
  it.each([
    ["1.234,56", 123456],
    ["1234,56", 123456],
    ["1,234.56", 123456],
    ["1234.56", 123456],
    ["30", 3000],
    ["R$ 30,00", 3000],
    ["US$ 65.00", 6500],
    ["1.234", 123400],
    ["0,5", 50],
  ])("%s → %i centavos", (input, cents) => expect(parseMoneyToCents(input)).toBe(cents));
  it.each(["", "0", "0,00", "-10", "abc"])("recusa %s", (input) => expect(parseMoneyToCents(input)).toBeNull());
});
