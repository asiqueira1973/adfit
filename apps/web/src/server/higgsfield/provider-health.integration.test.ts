import { afterAll, describe, expect, it } from "vitest";
import { assertLocalSupabase } from "@/test/local-db";
import { createAdminClient } from "../db/supabase";
import { businessCodeOf } from "../api/http";
import { assertProviderAvailable, isProviderCreditError, providerOutOfCredits } from "./provider-health";

/**
 * Saldo da Higgsfield esgotado (pedido do Alexandre, 01/11/2026): o X da cena 2 sem explicação.
 * Detecta o erro de saldo nas gerações recentes; uma geração bem-sucedida depois limpa o aviso.
 */
assertLocalSupabase();
const db = createAdminClient();
const ids: string[] = [];
let marcaId = "";

afterAll(async () => {
  if (ids.length) await db.from("geracoes").delete().in("id", ids);
  if (marcaId) await db.from("marcas").delete().eq("id", marcaId);
});

describe("saldo da Higgsfield", () => {
  it("reconhece as mensagens de saldo da Higgsfield", () => {
    expect(isProviderCreditError("Your credit balance is too low to complete this request. Please top up your balance and try again.")).toBe(true);
    expect(isProviderCreditError("submissao: higgsfield_http_403: {\"detail\":\"not_enough_credits\"}")).toBe(true);
    expect(isProviderCreditError("nsfw")).toBe(false);
    expect(isProviderCreditError(null)).toBe(false);
  });

  it("erro de saldo recente → esgotado; geração concluída depois → normal", async () => {
    const { data: m } = await db.from("marcas").insert({ nome: `Saldo HF ${Date.now()}` }).select("id").single();
    marcaId = m!.id;
    const base = Date.now() + 10 * 60_000; // no "futuro", à frente de qualquer geração de outros testes
    const { data: e } = await db.from("geracoes").insert({ marca_id: marcaId, tipo: "clipe_video", modelo: "m", entrada: {}, status: "falhou", erro: "Your credit balance is too low to complete this request.", criado_em: new Date(base).toISOString(), concluido_em: new Date(base).toISOString() }).select("id").single();
    ids.push(e!.id);
    expect(await providerOutOfCredits(base + 60_000)).toBe(true);
    // Ações cobradas são barradas antes do débito, com código próprio.
    expect(businessCodeOf(await assertProviderAvailable(base + 60_000).catch((x) => x))).toBe("servico_indisponivel");
    // Passadas 2 h sem nova tentativa, o aviso não trava mais nada.
    expect(await providerOutOfCredits(base + 3 * 3_600_000)).toBe(false);
    const { data: ok } = await db.from("geracoes").insert({ marca_id: marcaId, tipo: "clipe_video", modelo: "m", entrada: {}, status: "concluida", criado_em: new Date(base + 120_000).toISOString(), concluido_em: new Date(base + 120_000).toISOString() }).select("id").single();
    ids.push(ok!.id);
    expect(await providerOutOfCredits(base + 180_000)).toBe(false);
  });
});
