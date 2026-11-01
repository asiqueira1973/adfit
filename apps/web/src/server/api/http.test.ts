import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n";
import { BusinessError, businessCodeOf, businessError } from "./http";

describe("erros de negócio (seção 13)", () => {
  it("ajuste negativo usa a copy literal da seção 15", () => {
    expect(businessError("saldo_negativo", getDictionary("pt_br"))).toEqual({ mensagem: "O ajuste deixaria o saldo negativo.", status: 422 });
    expect(businessError("saldo_negativo", getDictionary("en")).mensagem).toBe("This adjustment would make the balance negative.");
  });
  it("extrai o código de erro do Postgres e de BusinessError", () => {
    expect(businessCodeOf({ message: "saldo_negativo" })).toBe("saldo_negativo");
    expect(businessCodeOf(new BusinessError("email_existente"))).toBe("email_existente");
    expect(businessCodeOf({ message: "duplicate key value violates unique constraint" })).toBeNull();
  });
  it("marca pausada responde com a copy da seção 15 e o contato de suporte", () => {
    expect(businessError("marca_inativa", getDictionary("pt_br"), "WhatsApp 1")).toEqual({ mensagem: "Conta pausada. Fale com o suporte: WhatsApp 1", status: 423 });
  });
  it("código desconhecido vira erro genérico 500", () => {
    expect(businessError("xyz", getDictionary("pt_br")).status).toBe(500);
  });
});
