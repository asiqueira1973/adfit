import { beforeAll, describe, expect, it } from "vitest";
import { assertLocalSupabase } from "@/test/local-db";
import { createAdminClient } from "../db/supabase";
import { businessCodeOf } from "../api/http";
import { createBrand, updateBrand } from "./brands";
import { launchCredits } from "./credits";
import { inviteUser, setUserActive } from "./users";
import { launchCreditsSchema } from "./schemas";

/**
 * Critérios do épico 8.2 contra o Supabase local: criar marca, convidar usuário (perfil com a
 * marca certa e e-mail de convite com link para /auth/confirm), lançar créditos (saldo 100 e
 * saldo_apos 100), ajuste negativo recusado, pausar marca e desativar usuário.
 */
assertLocalSupabase();
const db = createAdminClient();
const suffix = Date.now().toString(36);
let marcaId = "";
let adminId = "";

beforeAll(async () => {
  const { data } = await db.from("perfis").select("id").eq("papel", "admin_plataforma").limit(1).single();
  adminId = data!.id;
  marcaId = await createBrand({ nome: `Marca teste ${suffix}`, instagram: `teste_${suffix}` });
});

describe("8.2 — marcas", () => {
  it("cria marca com nome e @ (saldo 0, ativa)", async () => {
    const { data } = await db.from("marcas").select("nome, instagram, saldo_creditos, ativa").eq("id", marcaId).single();
    expect(data).toEqual({ nome: `Marca teste ${suffix}`, instagram: `teste_${suffix}`, saldo_creditos: 0, ativa: true });
  });

  it("edita todos os campos do kit", async () => {
    await updateBrand(marcaId, { cor_destaque: "#112233", cta_padrao: "Compre já", tom_de_voz: "direto", idioma_anuncios: "en" });
    const { data } = await db.from("marcas").select("cor_destaque, cta_padrao, tom_de_voz, idioma_anuncios").eq("id", marcaId).single();
    expect(data).toEqual({ cor_destaque: "#112233", cta_padrao: "Compre já", tom_de_voz: "direto", idioma_anuncios: "en" });
  });
});

describe("8.2 — logo do kit", () => {
  it("grava logo_path da pasta da própria marca e recusa caminho de outra marca", async () => {
    const path = `${marcaId}/logo/teste.png`;
    const png = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
    const { error: upErr } = await db.storage.from("marcas").upload(path, png, { contentType: "image/png", upsert: true });
    expect(upErr).toBeNull();
    await updateBrand(marcaId, { logo_path: path });
    expect((await db.from("marcas").select("logo_path").eq("id", marcaId).single()).data!.logo_path).toBe(path);
    const err = await updateBrand(marcaId, { logo_path: "00000000-0000-0000-0000-000000000000/logo/x.png" }).catch((e) => e);
    expect(businessCodeOf(err)).toBe("validacao");
  });

  it("PATCH sem nenhum campo válido é erro de validação, não 'marca não encontrada'", async () => {
    const err = await updateBrand(marcaId, {}).catch((e) => e);
    expect(businessCodeOf(err)).toBe("validacao");
  });
});

describe("8.2 — créditos", () => {
  it("lançar compra exige valor pago > 0 (schema e banco)", async () => {
    expect(launchCreditsSchema.safeParse({ marca_id: marcaId, tipo: "compra", quantidade: 100, valor_pago_centavos: 0 }).success).toBe(false);
    const err = await launchCredits({ marca_id: marcaId, tipo: "compra", quantidade: 100, valor_pago_centavos: null, moeda: "brl" }, adminId).catch((e) => e);
    expect(businessCodeOf(err)).toBe("compra_exige_valor");
  });

  it("bônus e ajuste exigem observação", async () => {
    const bonus = await launchCredits({ marca_id: marcaId, tipo: "bonus", quantidade: 5 }, adminId).catch((e) => e);
    expect(businessCodeOf(bonus)).toBe("observacao_obrigatoria");
    const ajuste = await launchCredits({ marca_id: marcaId, tipo: "ajuste_manual", quantidade: -1 }, adminId).catch((e) => e);
    expect(businessCodeOf(ajuste)).toBe("observacao_obrigatoria");
  });

  it("após lançar 100 créditos o saldo é 100 e o extrato mostra saldo_apos = 100", async () => {
    const movId = await launchCredits({ marca_id: marcaId, tipo: "compra", quantidade: 100, valor_pago_centavos: 55000, moeda: "brl" }, adminId);
    const { data: marca } = await db.from("marcas").select("saldo_creditos").eq("id", marcaId).single();
    const { data: mov } = await db.from("movimentacoes_creditos").select("tipo, quantidade, saldo_apos, valor_pago_centavos, moeda, criado_por").eq("id", movId).single();
    expect(marca!.saldo_creditos).toBe(100);
    expect(mov).toEqual({ tipo: "compra", quantidade: 100, saldo_apos: 100, valor_pago_centavos: 55000, moeda: "brl", criado_por: adminId });
  });

  it("ajuste negativo que deixaria saldo < 0 é recusado", async () => {
    const err = await launchCredits({ marca_id: marcaId, tipo: "ajuste_manual", quantidade: -101, observacao: "teste" }, adminId).catch((e) => e);
    expect(businessCodeOf(err)).toBe("saldo_negativo");
    const { data } = await db.from("marcas").select("saldo_creditos").eq("id", marcaId).single();
    expect(data!.saldo_creditos).toBe(100);
  });
});

describe("8.2 — usuários e pausa", () => {
  const email = `convite_${suffix}@kore.test`;
  let userId = "";

  it("convite cria o perfil com a marca certa e envia o e-mail com link para /auth/confirm", async () => {
    userId = await inviteUser({ email, nome: "Convidado Teste", marca_id: marcaId });
    const { data } = await db.from("perfis").select("marca_id, papel, ativo, email").eq("id", userId).single();
    expect(data).toEqual({ marca_id: marcaId, papel: "usuario_marca", ativo: true, email });

    const mailpit = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/:\d+$/, ":55324");
    const search = await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`).then((r) => r.json());
    expect(search.messages?.length).toBeGreaterThan(0);
    const message = await fetch(`${mailpit}/api/v1/message/${search.messages[0].ID}`).then((r) => r.json());
    expect(message.HTML).toMatch(/\/auth\/confirm\?next=%2Fdefinir-senha(&|&amp;)token_hash=\w+(&|&amp;)type=invite/);
  });

  it("e-mail já cadastrado é recusado", async () => {
    const err = await inviteUser({ email, nome: "De novo", marca_id: marcaId }).catch((e) => e);
    expect(businessCodeOf(err)).toBe("email_existente");
  });

  it("desativar e reativar usuário", async () => {
    await setUserActive(userId, false, adminId);
    expect((await db.from("perfis").select("ativo").eq("id", userId).single()).data!.ativo).toBe(false);
    await setUserActive(userId, true, adminId);
    expect((await db.from("perfis").select("ativo").eq("id", userId).single()).data!.ativo).toBe(true);
  });

  it("pausar marca bloqueia débito (seção 6.3) e reativar libera", async () => {
    await updateBrand(marcaId, { ativa: false });
    const { error } = await db.rpc("debitar_creditos", { p_marca_id: marcaId, p_acao: "gerar_ficha", p_quantidade_itens: 1, p_referencia_tipo: "ficha", p_referencia_id: null as unknown as string, p_criado_por: adminId });
    expect(error?.message).toBe("marca_inativa");
    await updateBrand(marcaId, { ativa: true });
    expect((await db.from("marcas").select("ativa").eq("id", marcaId).single()).data!.ativa).toBe(true);
  });
});
