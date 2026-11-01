import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertLocalSupabase } from "@/test/local-db";
import { higgsfieldHeaders } from "@/test/higgsfield";
import { createAdminClient } from "../db/supabase";
import { businessCodeOf } from "../api/http";
import type { PromptAdjuster } from "../claude/types";
import { CLAUSULA_IMAGEM } from "../prompts/clauses";
import { applyResult, failGeneration, getGeneration, setGenerationDepsForTests, type GenerationDeps } from "../higgsfield/process";
import { ORPHAN_AFTER_MS, reconsultGeneration, refreshStaleGenerations, TIMEOUT_MS } from "../higgsfield/stale";
import { handleHiggsfieldWebhook } from "../higgsfield/webhook";
import { normalizeResult, type HfResult } from "../higgsfield/types";
import { approveSheet, requestSheet, sheetStatus, type SheetActor } from "./service";
import submitQueued from "../higgsfield/__fixtures__/submit-queued.json";
import webhookCompleted from "../higgsfield/__fixtures__/webhook-completed.json";
import webhookFailed from "../higgsfield/__fixtures__/webhook-failed.json";
import webhookNsfw from "../higgsfield/__fixtures__/webhook-nsfw.json";
import statusCompleted from "../higgsfield/__fixtures__/status-completed.json";

/**
 * Critérios do épico 8.4 (seções 4.3, 11.2, 12.1, 12.3 e 13) contra o Supabase local, com dublês
 * gravados da Higgsfield e do Claude (seção 22). A chamada real é o teste manual do épico.
 */
assertLocalSupabase();
const db = createAdminClient();
const sfx = Date.now().toString(36);
const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
let marcaId = "";
let outraMarcaId = "";
let actor: SheetActor;
let seq = 0;

/** Dublê da Higgsfield: grava submissões; status configurável por request_id. */
type FakeHf = GenerationDeps & { submitted: Array<{ endpoint: string; body: Record<string, unknown>; requestId: string }>; statuses: Record<string, HfResult>; failSubmit: boolean };
function fakeHf(): FakeHf {
  const fake: FakeHf = {
    submitted: [],
    statuses: {},
    failSubmit: false,
    hf: {
      submit: async (endpoint, body) => {
        if (fake.failSubmit) throw new Error("higgsfield_http_500: indisponível");
        const requestId = `${submitQueued.request_id}_${sfx}_${++seq}`;
        fake.submitted.push({ endpoint, body, requestId });
        return { request_id: requestId };
      },
      status: async (id) => fake.statuses[id] ?? { request_id: id, status: "in_progress" },
      uploadInput: async () => `https://cdn.higgsfield.ai/inputs/${sfx}.png`,
    },
    download: async () => ({ bytes: PNG, contentType: "image/png" }),
  };
  return fake;
}

/** Fixture gravada com o request_id do teste. */
function payload(fixture: object, requestId: string): string {
  return JSON.stringify(fixture).replaceAll("REQUEST_ID", requestId);
}

const adjuster: PromptAdjuster & { calls: number } = {
  calls: 0,
  async adjustPrompt(input) {
    this.calls++;
    return { prompt: `${input.promptAtual}\nMake the logo smaller, on the left side.`, resumo_pt: "Logo menor, à esquerda" };
  },
};

let hf: FakeHf;
const token = () => process.env.HF_WEBHOOK_TOKEN!;
const saldo = async (id = marcaId) => (await db.from("marcas").select("saldo_creditos").eq("id", id).single()).data!.saldo_creditos;

/** Cria um produto com uma foto real no Storage local. */
async function newProduct(marca = marcaId, withPhoto = true): Promise<string> {
  const { data: p } = await db.from("produtos").insert({ marca_id: marca, nome: `Top ${sfx}`, categoria: "top" }).select("id").single();
  if (withPhoto) {
    const object = `${marca}/${p!.id}/originais/1.png`;
    await db.storage.from("produtos").upload(object, PNG, { contentType: "image/png", upsert: true });
    await db.from("fotos_produto").insert({ produto_id: p!.id, marca_id: marca, storage_path: `produtos/${object}` });
  }
  return p!.id;
}

const ficha = async (id: string) => (await db.from("fichas_produto").select("status, imagem_path, geracao_id, versao").eq("id", id).single()).data!;

beforeAll(async () => {
  const { data: m } = await db.from("marcas").insert({ nome: `Marca ficha ${sfx}` }).select("id").single();
  const { data: o } = await db.from("marcas").insert({ nome: `Outra ficha ${sfx}` }).select("id").single();
  marcaId = m!.id;
  outraMarcaId = o!.id;
  const { data: u } = await db.auth.admin.createUser({ email: `ficha_${sfx}@kore.test`, password: `x-${sfx}-senha`, email_confirm: true });
  await db.from("perfis").insert({ id: u.user!.id, marca_id: marcaId, nome: "Lojista", email: `ficha_${sfx}@kore.test` });
  actor = { id: u.user!.id, papel: "usuario_marca", marcaId };
  await db.rpc("lancar_creditos", { p_marca_id: marcaId, p_tipo: "bonus", p_quantidade: 100, p_valor_pago_centavos: null as never, p_observacao: "teste 8.4", p_criado_por: null as never });
});

beforeEach(() => {
  hf = fakeHf();
  setGenerationDepsForTests(hf);
});

afterAll(() => setGenerationDepsForTests(null));

describe("8.4 — gerar ficha", () => {
  it("debita exatamente gerar_ficha, cria a v1 `gerando` e submete ao modelo configurado com a cláusula fixa no fim", async () => {
    const produto = await newProduct();
    const antes = await saldo();
    const { fichaId } = await requestSheet(actor, produto, undefined);
    expect(await saldo()).toBe(antes - 2);
    const f = await ficha(fichaId);
    expect(f).toMatchObject({ status: "gerando", versao: 1, imagem_path: null });
    expect(hf.submitted).toHaveLength(1);
    expect(hf.submitted[0].endpoint).toBe("xai/grok-imagine-image-2.0");
    const prompt = String(hf.submitted[0].body.prompt);
    expect(prompt.endsWith(CLAUSULA_IMAGEM)).toBe(true);
    expect(prompt).toContain("sports top");
    expect(hf.submitted[0].body.image_urls).toEqual([`https://cdn.higgsfield.ai/inputs/${sfx}.png`]);
    const g = await getGeneration(f.geracao_id!);
    expect(g).toMatchObject({ status: "processando", tentativa: 1, request_id: hf.submitted[0].requestId });
    // Entrada sem URL assinada/temporária (seção 20).
    expect(JSON.stringify(g!.entrada)).not.toContain("https://");
  });

  it("recusa produto sem foto, de outra marca, arquivado e com ficha já gerando — sem débito", async () => {
    const antes = await saldo();
    const semFoto = await newProduct(marcaId, false);
    expect(businessCodeOf(await requestSheet(actor, semFoto, undefined).catch((e) => e))).toBe("produto_sem_fotos");
    const deOutra = await newProduct(outraMarcaId);
    expect(businessCodeOf(await requestSheet(actor, deOutra, undefined).catch((e) => e))).toBe("produto_inexistente");
    const arquivado = await newProduct();
    await db.from("produtos").update({ arquivado: true }).eq("id", arquivado);
    expect(businessCodeOf(await requestSheet(actor, arquivado, undefined).catch((e) => e))).toBe("produto_arquivado");
    expect(await saldo()).toBe(antes);

    const produto = await newProduct();
    await requestSheet(actor, produto, undefined);
    const depois = await saldo();
    expect(businessCodeOf(await requestSheet(actor, produto, undefined).catch((e) => e))).toBe("ficha_em_geracao");
    expect(await saldo()).toBe(depois);
  });

  it("dois cliques simultâneos: uma ficha só e um débito só", async () => {
    const produto = await newProduct();
    const antes = await saldo();
    const results = await Promise.allSettled([requestSheet(actor, produto, undefined), requestSheet(actor, produto, undefined)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await saldo()).toBe(antes - 2);
    const { count } = await db.from("fichas_produto").select("id", { count: "exact", head: true }).eq("produto_id", produto);
    expect(count).toBe(1);
  });

  it("marca pausada e saldo insuficiente não criam ficha nem debitam", async () => {
    const produto = await newProduct();
    await db.from("marcas").update({ ativa: false }).eq("id", marcaId);
    const paused = await requestSheet(actor, produto, undefined).catch((e) => e);
    await db.from("marcas").update({ ativa: true }).eq("id", marcaId);
    expect(businessCodeOf(paused)).toBe("marca_inativa");

    const { data: pobre } = await db.from("marcas").insert({ nome: `Sem saldo ${sfx}` }).select("id").single();
    const p2 = await newProduct(pobre!.id);
    const err = await requestSheet({ id: actor.id, papel: "admin_plataforma", marcaId: null }, p2, undefined).catch((e) => e);
    expect(businessCodeOf(err)).toBe("saldo_insuficiente");
    const { count } = await db.from("fichas_produto").select("id", { count: "exact", head: true }).in("produto_id", [produto, p2]);
    expect(count).toBe(0);
  });
});

describe("8.4 — webhook e resultado", () => {
  it("token errado → 401 sem efeito", async () => {
    const produto = await newProduct();
    const { fichaId } = await requestSheet(actor, produto, undefined);
    const rid = hf.submitted[0].requestId;
    const res = await handleHiggsfieldWebhook("errado", higgsfieldHeaders(payload(webhookCompleted, rid)), payload(webhookCompleted, rid));
    expect(res.status).toBe(401);
    expect((await ficha(fichaId)).status).toBe("gerando");
  });

  it("completed: copia ao Storage antes de liberar, grava custo; webhook repetido não duplica", async () => {
    const produto = await newProduct();
    const { fichaId } = await requestSheet(actor, produto, undefined);
    const rid = hf.submitted[0].requestId;
    const body = payload(webhookCompleted, rid);
    expect((await handleHiggsfieldWebhook(token(), higgsfieldHeaders(body), body)).status).toBe(200);
    expect((await handleHiggsfieldWebhook(token(), higgsfieldHeaders(body), body)).status).toBe(200);

    const f = await ficha(fichaId);
    expect(f.status).toBe("aguardando_aprovacao");
    expect(f.imagem_path).toMatch(new RegExp(`^produtos/${marcaId}/${produto}/fichas/v1-.+\\.png$`));
    const { data: file } = await db.storage.from("produtos").download(f.imagem_path!.replace(/^produtos\//, ""));
    expect(file?.size).toBe(PNG.length);
    const g = await getGeneration(f.geracao_id!);
    expect(g!.status).toBe("concluida");
    const { data: cost } = await db.from("geracoes").select("custo_usd, resultado_url").eq("id", g!.id).single();
    expect(Number(cost!.custo_usd)).toBe(0.09);
    expect(cost!.resultado_url).toBe(f.imagem_path);
  });

  it("request_id desconhecido → 404", async () => {
    const res = await handleHiggsfieldWebhook(token(), higgsfieldHeaders(payload(webhookCompleted, `nao_existe_${sfx}`)), payload(webhookCompleted, `nao_existe_${sfx}`));
    expect(res.status).toBe(404);
  });

  it("failed na tentativa 1 → tentativa 2 sem cobrança; failed de novo → ficha falhou e estorno integral", async () => {
    const produto = await newProduct();
    const antes = await saldo();
    const { fichaId } = await requestSheet(actor, produto, undefined);
    expect(await saldo()).toBe(antes - 2);

    await handleHiggsfieldWebhook(token(), higgsfieldHeaders(payload(webhookFailed, hf.submitted[0].requestId)), payload(webhookFailed, hf.submitted[0].requestId));
    const f1 = await ficha(fichaId);
    expect(f1.status).toBe("gerando");
    const g2 = await getGeneration(f1.geracao_id!);
    expect(g2).toMatchObject({ tentativa: 2, status: "processando" });
    expect(await saldo()).toBe(antes - 2);
    // Reenvio do webhook da tentativa 1 não cria outra tentativa.
    await handleHiggsfieldWebhook(token(), higgsfieldHeaders(payload(webhookFailed, hf.submitted[0].requestId)), payload(webhookFailed, hf.submitted[0].requestId));
    expect(hf.submitted).toHaveLength(2);

    await handleHiggsfieldWebhook(token(), higgsfieldHeaders(payload(webhookNsfw, hf.submitted[1].requestId)), payload(webhookNsfw, hf.submitted[1].requestId));
    expect((await ficha(fichaId)).status).toBe("falhou");
    expect((await getGeneration(g2!.id))!.status).toBe("bloqueada_nsfw");
    // Seção 7.3: custo_usd nulo quando falhou (não cobrado pela Higgsfield).
    const { data: custos } = await db.from("geracoes").select("custo_usd").in("id", [f1.geracao_id!, (await ficha(fichaId)).geracao_id!]);
    expect(custos!.every((c) => c.custo_usd === null)).toBe(true);
    expect(await saldo()).toBe(antes);
    // Webhook repetido da tentativa 2 não estorna de novo.
    await handleHiggsfieldWebhook(token(), higgsfieldHeaders(payload(webhookNsfw, hf.submitted[1].requestId)), payload(webhookNsfw, hf.submitted[1].requestId));
    expect(await saldo()).toBe(antes);
  });

  it("Higgsfield fora do ar na submissão → 2 tentativas, ficha falhou e estorno", async () => {
    const produto = await newProduct();
    const antes = await saldo();
    hf.failSubmit = true;
    const { fichaId } = await requestSheet(actor, produto, undefined);
    expect((await ficha(fichaId)).status).toBe("falhou");
    expect(await saldo()).toBe(antes);
  });

  it("polling de reserva: geração parada lê o status_url; mais de 15 min sem resposta → timeout e retentativa", async () => {
    const produto = await newProduct();
    const { fichaId } = await requestSheet(actor, produto, undefined);
    const f = await ficha(fichaId);
    const rid = hf.submitted[0].requestId;
    hf.statuses[rid] = normalizeResult(JSON.parse(payload(statusCompleted, rid)))!;
    expect(await reconsultGeneration(f.geracao_id!, { force: true })).toBe("concluida");
    expect((await ficha(fichaId)).status).toBe("aguardando_aprovacao");

    const outro = await newProduct();
    const { fichaId: f2 } = await requestSheet(actor, outro, undefined);
    const g = (await ficha(f2)).geracao_id!;
    expect(await reconsultGeneration(g, { force: true, now: Date.now() + TIMEOUT_MS + 60_000 })).toBe("falhou");
    expect((await getGeneration((await ficha(f2)).geracao_id!))!.tentativa).toBe(2);
  });
});

describe("8.4 — robustez (achados do verifier)", () => {
  it("função encerrada depois do débito e antes da submissão: a geração órfã é achada pelo polling, a ficha falha e o crédito volta", async () => {
    const produto = await newProduct();
    const antes = await saldo();
    // Simula a função morrendo durante a chamada ao Claude: o adjuster nunca responde.
    const hanging: PromptAdjuster = { adjustPrompt: () => new Promise(() => {}) };
    const { fichaId: v1 } = await requestSheet(actor, produto, undefined);
    await applyResult((await getGeneration((await ficha(v1)).geracao_id!))!, normalizeResult(JSON.parse(payload(webhookCompleted, hf.submitted[0].requestId)))!, hf);
    const meio = await saldo();
    void requestSheet(actor, produto, "cor mais escura", { adjuster: hanging });
    await new Promise((r) => setTimeout(r, 300));
    expect(await saldo()).toBe(meio - 1);
    const status = await sheetStatus(actor, produto);
    expect(status.geracoesEmAndamento).toHaveLength(1);
    await refreshStaleGenerations({ geracaoIds: status.geracoesEmAndamento }, Date.now() + ORPHAN_AFTER_MS + 60_000);
    const v2 = status.versoes.find((v) => v.versao === 2)!;
    expect((await ficha(v2.id)).status).toBe("falhou");
    expect(await saldo()).toBe(meio);
    expect(antes - 2).toBe(meio);
  });

  it("completed atrasado da tentativa 1 depois da retentativa não quebra o webhook nem toca a ficha", async () => {
    const produto = await newProduct();
    const { fichaId } = await requestSheet(actor, produto, undefined);
    const g1 = (await getGeneration((await ficha(fichaId)).geracao_id!))!;
    await failGeneration(g1, "falhou", "timeout_15min", hf);
    const t2 = (await ficha(fichaId)).geracao_id!;
    expect(t2).not.toBe(g1.id);
    // Resultado da tentativa 1 processado com a leitura antiga (corrida webhook × timeout).
    await expect(applyResult(g1, normalizeResult(JSON.parse(payload(webhookCompleted, g1.request_id!)))!, hf)).resolves.toBeUndefined();
    expect(await ficha(fichaId)).toMatchObject({ status: "gerando", geracao_id: t2, imagem_path: null });
  });
});

describe("8.4 — refazer e aprovar", () => {
  it("refazer debita refazer_ficha, usa o Claude (C.3) e mantém a cláusula fixa; aprovar e voltar para versão anterior", async () => {
    const produto = await newProduct();
    const { fichaId: v1 } = await requestSheet(actor, produto, undefined);
    await applyResult((await getGeneration((await ficha(v1)).geracao_id!))!, normalizeResult(JSON.parse(payload(webhookCompleted, hf.submitted[0].requestId)))!, hf);

    const antes = await saldo();
    adjuster.calls = 0;
    const { fichaId: v2 } = await requestSheet(actor, produto, "o logo é menor e fica do lado esquerdo", { adjuster });
    expect(await saldo()).toBe(antes - 1);
    expect(adjuster.calls).toBe(1);
    const prompt = String(hf.submitted[1].body.prompt);
    expect(prompt).toContain("Make the logo smaller");
    expect(prompt).not.toContain("o logo é menor");
    expect(prompt.endsWith(CLAUSULA_IMAGEM)).toBe(true);
    expect(prompt.split(CLAUSULA_IMAGEM)).toHaveLength(2);
    const fv2 = await ficha(v2);
    expect(fv2.versao).toBe(2);
    expect((await ficha(v1)).status).toBe("aguardando_aprovacao");

    await applyResult((await getGeneration(fv2.geracao_id!))!, normalizeResult(JSON.parse(payload(webhookCompleted, hf.submitted[1].requestId)))!, hf);
    await approveSheet(actor, v2);
    expect((await db.from("produtos").select("ficha_aprovada_id").eq("id", produto).single()).data!.ficha_aprovada_id).toBe(v2);
    expect((await ficha(v1)).status).toBe("descartada");

    const semCusto = await saldo();
    await approveSheet(actor, v1);
    expect((await db.from("produtos").select("ficha_aprovada_id").eq("id", produto).single()).data!.ficha_aprovada_id).toBe(v1);
    expect((await ficha(v2)).status).toBe("descartada");
    expect(await saldo()).toBe(semCusto);

    const status = await sheetStatus(actor, produto);
    expect(status.versoes.map((v) => v.status)).toEqual(["aprovada", "descartada"]);
    expect(JSON.stringify(status)).not.toMatch(/prompt|modelo|custo/);
  });

  it("aprovar ficha de outra marca ou gerando é recusado", async () => {
    const produto = await newProduct();
    const { fichaId } = await requestSheet(actor, produto, undefined);
    expect(businessCodeOf(await approveSheet(actor, fichaId).catch((e) => e))).toBe("transicao_invalida");
    const outro = await newProduct(outraMarcaId);
    const { data: f } = await db.from("fichas_produto").insert({ produto_id: outro, marca_id: outraMarcaId, versao: 1, status: "aguardando_aprovacao", imagem_path: "produtos/x.png" }).select("id").single();
    expect(businessCodeOf(await approveSheet(actor, f!.id).catch((e) => e))).toBe("ficha_inexistente");
  });

  it("Claude falha na refação → ficha falhou e estorno do refazer", async () => {
    const produto = await newProduct();
    const { fichaId: v1 } = await requestSheet(actor, produto, undefined);
    await applyResult((await getGeneration((await ficha(v1)).geracao_id!))!, normalizeResult(JSON.parse(payload(webhookCompleted, hf.submitted[0].requestId)))!, hf);
    const antes = await saldo();
    const broken: PromptAdjuster = { adjustPrompt: async () => Promise.reject(new Error("claude_fora_do_schema")) };
    const { fichaId } = await requestSheet(actor, produto, "cor mais escura", { adjuster: broken });
    expect((await ficha(fichaId)).status).toBe("falhou");
    expect(await saldo()).toBe(antes);
  });
});
