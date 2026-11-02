import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertLocalSupabase } from "@/test/local-db";
import { higgsfieldHeaders } from "@/test/higgsfield";
import { createAdminClient } from "../db/supabase";
import { businessCodeOf } from "../api/http";
import type { CharacterDescriber } from "../claude/types";
import { setGenerationDepsForTests, type GenerationDeps } from "../higgsfield/process";
import { handleHiggsfieldWebhook } from "../higgsfield/webhook";
import webhookCompleted from "../higgsfield/__fixtures__/webhook-completed.json";
import webhookFailed from "../higgsfield/__fixtures__/webhook-failed.json";
import { addCharacterPhotos, approveCharacterSheet, createCharacter, getCharacterView, listCharacters, requestCharacterSheet, setCharacterAiForTests, type CharacterActor } from "./service";

/** Catálogo de personagens (MD-17, plans/I-2-personagens.md) contra o Supabase local, com dublês. */
assertLocalSupabase();
const db = createAdminClient();
const sfx = Date.now().toString(36);
const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
let marcaId = "";
let outraMarcaId = "";
let actor: CharacterActor;
let seq = 0;

type FakeHf = GenerationDeps & { submitted: Array<{ endpoint: string; body: Record<string, unknown>; requestId: string }> };
function fakeHf(): FakeHf {
  const fake: FakeHf = {
    submitted: [],
    hf: {
      submit: async (endpoint, body) => {
        const requestId = `REQ_CHAR_${sfx}_${++seq}`;
        fake.submitted.push({ endpoint, body, requestId });
        return { request_id: requestId };
      },
      status: async (id) => ({ request_id: id, status: "in_progress" }),
      uploadInput: async () => `https://cdn.higgsfield.ai/inputs/${sfx}.jpg`,
    },
    download: async () => ({ bytes: PNG, contentType: "image/png" }),
  };
  return fake;
}
const describer: CharacterDescriber & { calls: number; lastFotos: number } = {
  calls: 0,
  lastFotos: 0,
  async describeCharacter(input) {
    this.calls++;
    this.lastFotos = input.fotos.length;
    return { modelo_en: "Woman in her late 20s, warm brown skin, long curly dark hair worn loose, athletic build." };
  },
};
let hf: FakeHf;
const deliver = (fixture: object, requestId: string) => {
  const body = JSON.stringify(fixture).replaceAll("REQUEST_ID", requestId);
  return handleHiggsfieldWebhook(process.env.HF_WEBHOOK_TOKEN!, higgsfieldHeaders(body), body);
};
const saldo = async () => (await db.from("marcas").select("saldo_creditos").eq("id", marcaId).single()).data!.saldo_creditos;
const ficha = async (id: string) => (await db.from("fichas_personagem").select("status, imagem_path").eq("id", id).single()).data!;

beforeAll(async () => {
  const { data: m } = await db.from("marcas").insert({ nome: `Marca personagem ${sfx}` }).select("id").single();
  const { data: o } = await db.from("marcas").insert({ nome: `Outra personagem ${sfx}` }).select("id").single();
  marcaId = m!.id;
  outraMarcaId = o!.id;
  const { data: u } = await db.auth.admin.createUser({ email: `personagem_${sfx}@kore.test`, password: `x-${sfx}-senha`, email_confirm: true });
  await db.from("perfis").insert({ id: u.user!.id, marca_id: marcaId, nome: "Lojista", email: `personagem_${sfx}@kore.test` });
  actor = { id: u.user!.id, papel: "usuario_marca", marcaId };
  await db.rpc("lancar_creditos", { p_marca_id: marcaId, p_tipo: "bonus", p_quantidade: 50, p_valor_pago_centavos: null as never, p_observacao: "teste MD-17", p_criado_por: null as never });
});
beforeEach(() => {
  hf = fakeHf();
  setGenerationDepsForTests(hf);
  setCharacterAiForTests(describer, { adjustPrompt: async (i) => ({ prompt: `${i.promptAtual}\nShorter hair.`, resumo_pt: "Cabelo mais curto" }) });
});
afterAll(() => {
  setGenerationDepsForTests(null);
  setCharacterAiForTests(null);
});

describe("personagens (MD-17)", () => {
  it("cria, gera a ficha (2 créditos, descrição pelo Claude, texto para imagem sem fotos), aprova e refaz (1 crédito)", async () => {
    const { personagemId } = await createCharacter(actor, { nome: "Ana", descricao: "cabelo cacheado, corredora", genero_modelo: "mulher", faixa_etaria: "de_20_a_30" });
    const antes = await saldo();
    const { fichaId } = await requestCharacterSheet(actor, personagemId, undefined);
    expect(await saldo()).toBe(antes - 2);
    expect(describer.calls).toBeGreaterThan(0);
    const { data: p } = await db.from("personagens").select("modelo_en").eq("id", personagemId).single();
    expect(p!.modelo_en).toContain("curly dark hair");
    const sub = hf.submitted.at(-1)!;
    expect(sub.endpoint).toBe("marketing-studio/image/flare");
    expect(sub.body.image_urls).toBeUndefined();
    expect(String(sub.body.prompt)).toContain("EXACTLY FOUR PANELS");
    expect(String(sub.body.prompt)).toContain("curly dark hair");

    await deliver(webhookCompleted, sub.requestId);
    expect((await ficha(fichaId)).status).toBe("aguardando_aprovacao");
    await approveCharacterSheet(actor, fichaId);
    expect((await listCharacters(marcaId, { soProntas: true })).map((c) => c.id)).toContain(personagemId);

    const antesRedo = await saldo();
    await requestCharacterSheet(actor, personagemId, { atalhos: ["texto_extra"] });
    expect(await saldo()).toBe(antesRedo - 1);
  });

  it("com fotos: manda as fotos como referência e o Claude descreve a partir delas", async () => {
    const { personagemId } = await createCharacter(actor, { nome: "Real", genero_modelo: "homem", faixa_etaria: "de_30_a_45" });
    const object = `${marcaId}/personagens/${personagemId}/originais/1.png`;
    await db.storage.from("produtos").upload(object, PNG, { contentType: "image/png", upsert: true });
    await addCharacterPhotos(actor, personagemId, [`produtos/${object}`]);
    await requestCharacterSheet(actor, personagemId, undefined);
    expect(describer.lastFotos).toBe(1);
    expect(hf.submitted.at(-1)!.body.image_urls).toHaveLength(1);
    const { data } = await db.from("personagens").select("origem").eq("id", personagemId).single();
    expect(data!.origem).toBe("fotos");
  });

  it("falha definitiva estorna; outra marca e caminho de foto fora da pasta são recusados", async () => {
    const { personagemId } = await createCharacter(actor, { nome: "Falha", genero_modelo: "mulher", faixa_etaria: "acima_de_45" });
    const antes = await saldo();
    const { fichaId } = await requestCharacterSheet(actor, personagemId, undefined);
    await deliver(webhookFailed, hf.submitted.at(-1)!.requestId);
    await deliver(webhookFailed, hf.submitted.at(-1)!.requestId); // a retentativa também falha
    expect((await ficha(fichaId)).status).toBe("falhou");
    expect(await saldo()).toBe(antes);

    const outro: CharacterActor = { ...actor, marcaId: outraMarcaId };
    expect(businessCodeOf(await requestCharacterSheet(outro, personagemId, undefined).catch((e) => e))).toBe("personagem_inexistente");
    expect(businessCodeOf(await addCharacterPhotos(actor, personagemId, [`produtos/${outraMarcaId}/personagens/${personagemId}/originais/x.png`]).catch((e) => e))).toBe("validacao");
  });

  it("tela da personagem: monta a visão com a ficha pronta (bug de 01/11/2026: a página quebrava)", async () => {
    const { personagemId } = await createCharacter(actor, { nome: "Tela", genero_modelo: "mulher", faixa_etaria: "de_20_a_30" });
    await requestCharacterSheet(actor, personagemId, undefined);
    await deliver(webhookCompleted, hf.submitted.at(-1)!.requestId);
    const view = await getCharacterView(actor, personagemId);
    expect(view.nome).toBe("Tela");
    expect(view.versoes).toHaveLength(1);
    expect(view.versoes[0].status).toBe("aguardando_aprovacao");
    expect(view.versoes[0].url).toMatch(/^http/);
  });
});
