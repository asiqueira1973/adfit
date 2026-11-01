import { describe, expect, it } from "vitest";
import { ledgerItem } from "./ledger-items";

/** Critério 8.8 (verificador, 01/11/2026): cada linha do extrato liga ao item — não só anúncio. */
describe("ledgerItem", () => {
  const maps = {
    fichas: { f1: "p1" },
    quadros: { q1: "a1" },
    clipes: { c1: "a1" },
    produtos: { p1: "Top Azul" },
    anuncios: { a1: "Top Azul · Orla · 16:9" },
  };
  it("ficha → produto; imagem e cena → anúncio; anúncio → anúncio", () => {
    expect(ledgerItem({ referencia_tipo: "ficha", referencia_id: "f1" }, maps)).toEqual({ href: "/produtos/p1", label: "Top Azul" });
    expect(ledgerItem({ referencia_tipo: "quadro", referencia_id: "q1" }, maps)).toEqual({ href: "/anuncios/a1", label: "Top Azul · Orla · 16:9" });
    expect(ledgerItem({ referencia_tipo: "clipe", referencia_id: "c1" }, maps)).toEqual({ href: "/anuncios/a1", label: "Top Azul · Orla · 16:9" });
    expect(ledgerItem({ referencia_tipo: "anuncio", referencia_id: "a1" }, maps)).toEqual({ href: "/anuncios/a1", label: "Top Azul · Orla · 16:9" });
  });
  it("sem referência ou item que não existe mais (arquivado/órfão) → sem link", () => {
    expect(ledgerItem({ referencia_tipo: null, referencia_id: null }, maps)).toBeNull();
    expect(ledgerItem({ referencia_tipo: "clipe", referencia_id: "x" }, maps)).toBeNull();
  });
});
