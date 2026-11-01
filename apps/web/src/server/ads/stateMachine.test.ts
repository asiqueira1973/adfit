import { describe, expect, it } from "vitest";
import { AD_TRANSITIONS, canTransition, isBusy, type AdStatus } from "./stateMachine";

/** Máquina de estados do anúncio (seção 12.2): cada transição permitida e as proibidas. */
const ALL = Object.keys(AD_TRANSITIONS) as AdStatus[];
const ALLOWED: Array<[AdStatus, AdStatus]> = [
  ["gerando_roteiro", "gerando_quadros"],
  ["gerando_roteiro", "falhou"],
  ["gerando_quadros", "aguardando_aprovacao"],
  ["gerando_quadros", "falhou"],
  ["aguardando_aprovacao", "gerando_clipes"],
  ["gerando_clipes", "montando"],
  ["gerando_clipes", "aguardando_aprovacao"],
  ["montando", "pronto"],
  ["montando", "montando"],
  ["pronto", "gerando_clipes"],
  ["pronto", "montando"],
];

describe("máquina de estados do anúncio (12.2)", () => {
  it.each(ALLOWED)("%s → %s é permitida", (from, to) => expect(canTransition(from, to)).toBe(true));

  it("todas as outras combinações são proibidas, inclusive qualquer volta para gerando_roteiro e saída de falhou", () => {
    for (const from of ALL) {
      for (const to of ALL) {
        const allowed = ALLOWED.some(([f, t]) => f === from && t === to);
        expect(canTransition(from, to), `${from} → ${to}`).toBe(allowed);
      }
    }
    expect(ALL.some((s) => canTransition(s, "gerando_roteiro"))).toBe(false);
    expect(AD_TRANSITIONS.falhou).toHaveLength(0);
  });

  it("bloqueia ações durante gerando_* e montando", () => {
    expect(ALL.filter(isBusy).sort()).toEqual(["gerando_clipes", "gerando_quadros", "gerando_roteiro", "montando"]);
  });
});
