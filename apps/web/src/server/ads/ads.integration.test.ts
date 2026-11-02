import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertLocalSupabase } from "@/test/local-db";
import { higgsfieldHeaders } from "@/test/higgsfield";
import { createAdminClient } from "../db/supabase";
import { businessCodeOf } from "../api/http";
import type { AiClient, FrameQc, Script } from "../claude/types";
import { CLAUSULA_IMAGEM } from "../prompts/clauses";
import { PROMPT_VERSIONS } from "../prompts";
import { setGenerationDepsForTests, type GenerationDeps } from "../higgsfield/process";
import { handleHiggsfieldWebhook } from "../higgsfield/webhook";
import webhookCompleted from "../higgsfield/__fixtures__/webhook-completed.json";
import webhookFailed from "../higgsfield/__fixtures__/webhook-failed.json";
import { setAiClientForTests } from "./runtime";
import { AD_ORPHAN_AFTER_MS, archiveAd, createAd, getAdView, listAds, patchAdTexts, refreshAd, type AdActor, type CreateAdInput } from "./service";

/**
 * Critérios do épico 8.5 (seções 11.2–11.5, 11.7, 12.2 e 13) contra o Supabase local, com dublês
 * do Claude e da Higgsfield (seção 22). O teste manual com as chaves reais é feito à parte.
 */
assertLocalSupabase();
const db = createAdminClient();
const sfx = Date.now().toString(36);
const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
let marcaId = "";
let outraMarcaId = "";
let actor: AdActor;
let seq = 0;

const SCRIPT: Script = {
  conceito: "Força no agachamento",
  modelo: "Woman in her late 20s, warm brown skin, curly dark hair in a high ponytail, athletic build",
  cenas: [
    { ordem: 1, descricao: "Close no agachamento", prompt_quadro: "Low-angle close-up, barbell squat, gym", prompt_movimento: "slow push-in", texto_tela: "Firme do começo ao fim" },
    { ordem: 2, descricao: "Peça em ação no levantamento terra", prompt_quadro: "Medium shot deadlift, logo visible", prompt_movimento: "lift up", texto_tela: "Emagreça treinando" },
    { ordem: 3, descricao: "Pose final de confiança", prompt_quadro: "Hero shot, confident pose", prompt_movimento: "breathing", texto_tela: null },
  ],
};
const GOOD: FrameQc = { fidelidade_peca: 9, logo_visivel_correto: 9, anatomia: 9, texto_espurio: false, conteudo_improprio: false, motivo: "" };
const BAD: FrameQc = { ...GOOD, fidelidade_peca: 4, motivo: "Logo is missing on the chest" };

type FakeAi = AiClient & { qcQueue: FrameQc[]; scriptFails: boolean; scripts: number };
function fakeAi(): FakeAi {
  const ai: FakeAi = {
    qcQueue: [],
    scriptFails: false,
    scripts: 0,
    adjustPrompt: async (i) => ({ prompt: i.promptAtual, resumo_pt: "ok" }),
    writeScript: async () => {
      ai.scripts++;
      if (ai.scriptFails) throw new Error("claude_fora_do_schema");
      return structuredClone(SCRIPT);
    },
    checkFrame: async () => ai.qcQueue.shift() ?? GOOD,
    reviewTexts: async ({ textos }) => ({ textos: textos.map((_, i) => ({ indice: i, problema: false, sugestao: null })) }),
  };
  return ai;
}

type FakeHf = GenerationDeps & { submitted: Array<{ body: Record<string, unknown>; requestId: string }> };
function fakeHf(): FakeHf {
  const fake: FakeHf = {
    submitted: [],
    hf: {
      submit: async (_endpoint, body) => {
        const requestId = `REQ_ADS_${sfx}_${++seq}`;
        fake.submitted.push({ body, requestId });
        return { request_id: requestId };
      },
      status: async (id) => ({ request_id: id, status: "in_progress" }),
      uploadInput: async () => `https://cdn.higgsfield.ai/inputs/${sfx}.png`,
    },
    download: async () => ({ bytes: PNG, contentType: "image/png" }),
  };
  return fake;
}

let ai: FakeAi;
let hf: FakeHf;
const token = () => process.env.HF_WEBHOOK_TOKEN!;
const deliver = (fixture: object, requestId: string) => {
  const body = JSON.stringify(fixture).replaceAll("REQUEST_ID", requestId);
  return handleHiggsfieldWebhook(token(), higgsfieldHeaders(body), body);
};
const saldo = async () => (await db.from("marcas").select("saldo_creditos").eq("id", marcaId).single()).data!.saldo_creditos;
const adRow = async (id: string) => (await db.from("anuncios").select("status, roteiro, prompt_versao, ficha_id, erro").eq("id", id).single()).data!;

/** Produto com ficha aprovada (imagem real no Storage local). */
async function approvedProduct(marca = marcaId): Promise<string> {
  const { data: p } = await db.from("produtos").insert({ marca_id: marca, nome: `Top ${sfx}`, categoria: "top" }).select("id").single();
  const object = `${marca}/${p!.id}/fichas/v1-teste.png`;
  await db.storage.from("produtos").upload(object, PNG, { contentType: "image/png", upsert: true });
  const { data: f } = await db.from("fichas_produto").insert({ produto_id: p!.id, marca_id: marca, versao: 1, status: "aguardando_aprovacao", imagem_path: `produtos/${object}` }).select("id").single();
  await db.rpc("aprovar_ficha", { p_ficha_id: f!.id });
  return p!.id;
}

const input = (produto_id: string, extra: Partial<CreateAdInput> = {}): CreateAdInput => ({
  produto_id,
  cenario: "academia",
  modalidade: "musculacao",
  genero_modelo: "mulher",
  faixa_etaria: "de_20_a_30",
  estilo: "energetico",
  formato: "vertical_9_16",
  com_texto: true,
  ...extra,
});

/** Entrega `completed` para as submissões ainda não entregues. */
async function completeAll(from = 0) {
  for (const s of hf.submitted.slice(from)) await deliver(webhookCompleted, s.requestId);
}

beforeAll(async () => {
  const { data: m } = await db.from("marcas").insert({ nome: `Marca anúncio ${sfx}` }).select("id").single();
  const { data: o } = await db.from("marcas").insert({ nome: `Outra anúncio ${sfx}` }).select("id").single();
  marcaId = m!.id;
  outraMarcaId = o!.id;
  const { data: u } = await db.auth.admin.createUser({ email: `anuncio_${sfx}@kore.test`, password: `x-${sfx}-senha`, email_confirm: true });
  await db.from("perfis").insert({ id: u.user!.id, marca_id: marcaId, nome: "Lojista", email: `anuncio_${sfx}@kore.test` });
  actor = { id: u.user!.id, papel: "usuario_marca", marcaId, idioma: "pt_br" };
  await db.rpc("lancar_creditos", { p_marca_id: marcaId, p_tipo: "bonus", p_quantidade: 100, p_valor_pago_centavos: null as never, p_observacao: "teste 8.5", p_criado_por: null as never });
});

beforeEach(() => {
  ai = fakeAi();
  hf = fakeHf();
  setAiClientForTests(ai);
  setGenerationDepsForTests(hf);
});

afterAll(() => {
  setAiClientForTests(null);
  setGenerationDepsForTests(null);
});

describe("8.5 — criar anúncio", () => {
  it("debita gerar_roteiro_quadros antes do Claude, salva o roteiro, cria 3 cenas e submete 3 quadros em paralelo", async () => {
    const produto = await approvedProduct();
    const antes = await saldo();
    const { anuncioId } = await createAd(actor, input(produto, { observacoes: "cabelo cacheado" }));
    expect(await saldo()).toBe(antes - 2);
    expect(ai.scripts).toBe(1);

    const ad = await adRow(anuncioId);
    expect(ad.status).toBe("gerando_quadros");
    expect(ad.prompt_versao).toBe(`${PROMPT_VERSIONS.roteiro}+quadro.v2`);
    expect((ad.roteiro as Script).cenas).toHaveLength(3);
    const { data: cenas } = await db.from("cenas").select("ordem, texto_tela").eq("anuncio_id", anuncioId).order("ordem");
    // Texto com termo proibido gerado pelo Claude vira a descrição neutra (seção 20).
    expect(cenas).toEqual([
      { ordem: 1, texto_tela: "Firme do começo ao fim" },
      { ordem: 2, texto_tela: "Peça em ação no levantamento\nterra" },
      { ordem: 3, texto_tela: null },
    ]);

    expect(hf.submitted).toHaveLength(3);
    for (const s of hf.submitted) {
      const prompt = String(s.body.prompt);
      expect(prompt).toContain(SCRIPT.modelo);
      expect(prompt).toContain("Reference image 1 is the garment reference sheet.");
      expect(prompt.endsWith(CLAUSULA_IMAGEM)).toBe(true);
      expect(s.body.aspect_ratio).toBe("9:16");
    }
  });

  it("produto sem ficha aprovada, de outra marca e marca pausada são recusados sem débito", async () => {
    const { data: semFicha } = await db.from("produtos").insert({ marca_id: marcaId, nome: "Sem ficha", categoria: "top" }).select("id").single();
    const antes = await saldo();
    expect(businessCodeOf(await createAd(actor, input(semFicha!.id)).catch((e) => e))).toBe("produto_sem_ficha");
    const deOutra = await approvedProduct(outraMarcaId);
    expect(businessCodeOf(await createAd(actor, input(deOutra)).catch((e) => e))).toBe("produto_inexistente");
    const produto = await approvedProduct();
    await db.from("marcas").update({ ativa: false }).eq("id", marcaId);
    const paused = await createAd(actor, input(produto)).catch((e) => e);
    await db.from("marcas").update({ ativa: true }).eq("id", marcaId);
    expect(businessCodeOf(paused)).toBe("marca_inativa");
    expect(await saldo()).toBe(antes);
  });

  it("Claude falha (2 tentativas dentro do cliente) → anúncio falhou e estorno integral", async () => {
    const produto = await approvedProduct();
    const antes = await saldo();
    ai.scriptFails = true;
    const { anuncioId } = await createAd(actor, input(produto));
    expect(await adRow(anuncioId)).toMatchObject({ status: "falhou" });
    expect(await saldo()).toBe(antes);
    expect(hf.submitted).toHaveLength(0);
  });
});

describe("8.5 — quadros e QC", () => {
  it("3 quadros aprovados no QC → aguardando_aprovacao e quadro_atual_id definido", async () => {
    const produto = await approvedProduct();
    const { anuncioId } = await createAd(actor, input(produto));
    await completeAll();
    expect((await adRow(anuncioId)).status).toBe("aguardando_aprovacao");
    const view = await getAdView(actor, anuncioId);
    expect(view.cenas.every((c) => c.quadroAtualId && c.quadros[0].status === "pronto" && c.quadros[0].url && !c.quadros[0].avisoQc)).toBe(true);
    // Nada técnico na visão do usuário (seção 5).
    expect(JSON.stringify(view)).not.toMatch(/prompt|modelo|custo|qc_detalhe|roteiro/);
  });

  it("QC reprova 1 vez → regenera sem cobrança com o motivo no prompt e aprova; reprova 2 vezes → pronto com aviso", async () => {
    const produto = await approvedProduct();
    const antes = await saldo();
    const { anuncioId } = await createAd(actor, input(produto));
    ai.qcQueue = [BAD, GOOD, BAD, BAD, GOOD];
    await completeAll(0); // 3 primeiros: cena A reprova (regenera), cena B aprova, cena C reprova (regenera)
    expect(hf.submitted).toHaveLength(5);
    expect(String(hf.submitted[3].body.prompt)).toContain("Fix from the previous attempt: Logo is missing on the front");
    await completeAll(3); // regenerações: A reprova de novo (aviso), C aprova
    expect(await saldo()).toBe(antes - 2);
    expect((await adRow(anuncioId)).status).toBe("aguardando_aprovacao");
    const view = await getAdView(actor, anuncioId);
    expect(view.cenas.filter((c) => c.quadros[0].avisoQc)).toHaveLength(1);
    expect(view.cenas.every((c) => c.quadros.length === 1 && c.quadros[0].status === "pronto")).toBe(true);
  });

  it("conteúdo impróprio nunca é mostrado: a cena falha e o anúncio segue com as outras (D-18)", async () => {
    const produto = await approvedProduct();
    const { anuncioId } = await createAd(actor, input(produto));
    ai.qcQueue = [{ ...GOOD, conteudo_improprio: true }];
    await completeAll();
    expect((await adRow(anuncioId)).status).toBe("aguardando_aprovacao");
    const view = await getAdView(actor, anuncioId);
    const falhou = view.cenas.find((c) => c.quadros[0].status === "falhou")!;
    expect(falhou.quadros[0].url).toBeNull();
    expect(falhou.quadroAtualId).toBeNull();
  });

  it("os 3 quadros falham tecnicamente (com a retentativa) → anúncio falhou e estorno integral", async () => {
    const produto = await approvedProduct();
    const antes = await saldo();
    const { anuncioId } = await createAd(actor, input(produto));
    for (const s of hf.submitted.slice(0, 3)) await deliver(webhookFailed, s.requestId);
    expect(hf.submitted).toHaveLength(6);
    for (const s of hf.submitted.slice(3)) await deliver(webhookFailed, s.requestId);
    expect(await adRow(anuncioId)).toMatchObject({ status: "falhou", erro: "os_3_quadros_falharam" });
    expect(await saldo()).toBe(antes);
  });

  it("roteiro parado há mais de 6 min (função encerrada) → falhou e estorno pela varredura", async () => {
    const produto = await approvedProduct();
    const antes = await saldo();
    const anuncioId = crypto.randomUUID();
    const { data: p } = await db.from("produtos").select("ficha_aprovada_id").eq("id", produto).single();
    const { data: debit } = await db.rpc("debitar_creditos", { p_marca_id: marcaId, p_acao: "gerar_roteiro_quadros", p_quantidade_itens: 1, p_referencia_tipo: "anuncio", p_referencia_id: anuncioId, p_criado_por: actor.id });
    expect(debit).toBeTruthy();
    await db.from("anuncios").insert({ id: anuncioId, marca_id: marcaId, produto_id: produto, ficha_id: p!.ficha_aprovada_id!, criado_por: actor.id, titulo: "x", cenario: "academia", modalidade: "musculacao", genero_modelo: "mulher" });
    await refreshAd(anuncioId, Date.now() + AD_ORPHAN_AFTER_MS + 60_000);
    expect((await adRow(anuncioId)).status).toBe("falhou");
    expect(await saldo()).toBe(antes);
  });

  it("função encerrada depois de gravar as cenas e antes da transição → a varredura também falha e estorna", async () => {
    const produto = await approvedProduct();
    const antes = await saldo();
    const anuncioId = crypto.randomUUID();
    const { data: p } = await db.from("produtos").select("ficha_aprovada_id").eq("id", produto).single();
    await db.rpc("debitar_creditos", { p_marca_id: marcaId, p_acao: "gerar_roteiro_quadros", p_quantidade_itens: 1, p_referencia_tipo: "anuncio", p_referencia_id: anuncioId, p_criado_por: actor.id });
    await db.from("anuncios").insert({ id: anuncioId, marca_id: marcaId, produto_id: produto, ficha_id: p!.ficha_aprovada_id!, criado_por: actor.id, titulo: "x", cenario: "academia", modalidade: "musculacao", genero_modelo: "mulher" });
    await db.from("cenas").insert([1, 2, 3].map((ordem) => ({ anuncio_id: anuncioId, marca_id: marcaId, ordem, descricao: "d", prompt_quadro: "p", prompt_movimento: "m" })));
    await refreshAd(anuncioId, Date.now() + AD_ORPHAN_AFTER_MS + 60_000);
    expect((await adRow(anuncioId)).status).toBe("falhou");
    expect(await saldo()).toBe(antes);
  });
});

describe("8.5 — texto da tela editável", () => {
  it("salva 2×32, recusa fora do limite, avisa termo proibido e respeita status e marca", async () => {
    const produto = await approvedProduct();
    const { anuncioId } = await createAd(actor, input(produto));
    const { data: cenas } = await db.from("cenas").select("id, ordem").eq("anuncio_id", anuncioId).order("ordem");
    const [c1, , c3] = cenas!;

    // Ainda gerando quadros: edição não permitida (12.2).
    expect(businessCodeOf(await patchAdTexts(actor, anuncioId, { cenas: [{ id: c1.id, texto_tela: "Oi" }] }).catch((e) => e))).toBe("transicao_invalida");
    await completeAll();

    const ok = await patchAdTexts(actor, anuncioId, { cenas: [{ id: c1.id, texto_tela: "Perca 5 kg treinando\ncom a gente" }] });
    expect(ok.avisos).toEqual([c1.id]);
    expect((await db.from("cenas").select("texto_tela").eq("id", c1.id).single()).data!.texto_tela).toBe("Perca 5 kg treinando\ncom a gente");

    expect(businessCodeOf(await patchAdTexts(actor, anuncioId, { cenas: [{ id: c1.id, texto_tela: "x".repeat(33) }] }).catch((e) => e))).toBe("validacao");
    expect(businessCodeOf(await patchAdTexts(actor, anuncioId, { cenas: [{ id: c3.id, texto_tela: "Cena 3 não tem texto" }] }).catch((e) => e))).toBe("validacao");
    const outro: AdActor = { id: actor.id, papel: "usuario_marca", marcaId: outraMarcaId, idioma: "pt_br" };
    expect(businessCodeOf(await patchAdTexts(outro, anuncioId, { cenas: [] }).catch((e) => e))).toBe("anuncio_inexistente");
    expect(businessCodeOf(await getAdView(outro, anuncioId).catch((e) => e))).toBe("anuncio_inexistente");
  });
});

describe("arquivar anúncio (seção 6 \"Arquivar anúncio\"; pedido do Alexandre, 01/11/2026)", () => {
  it("anúncio que falhou é arquivado e some da lista; em andamento ou de outra marca é recusado", async () => {
    const produto = await approvedProduct();
    ai.scriptFails = true;
    const { anuncioId: falhou } = await createAd(actor, input(produto));
    expect((await adRow(falhou)).status).toBe("falhou");
    ai.scriptFails = false;

    const outro: AdActor = { ...actor, marcaId: outraMarcaId };
    expect(businessCodeOf(await archiveAd(outro, falhou).catch((e) => e))).toBe("anuncio_inexistente");

    await archiveAd(actor, falhou);
    expect((await listAds(marcaId)).some((a) => a.id === falhou)).toBe(false);
    expect(businessCodeOf(await getAdView(actor, falhou).catch((e) => e))).toBe("anuncio_inexistente");

    const { anuncioId: gerando } = await createAd(actor, input(produto));
    expect(businessCodeOf(await archiveAd(actor, gerando).catch((e) => e))).toBe("transicao_invalida");
  });
});

describe("fecho opcional (MD-15)", () => {
  it("grava com_fecho; sem informar, o anúncio sai com fecho", async () => {
    const produto = await approvedProduct();
    const { anuncioId: sem } = await createAd(actor, input(produto, { com_fecho: false }));
    const { anuncioId: padrao } = await createAd(actor, input(produto));
    const { data } = await db.from("anuncios").select("id, com_fecho").in("id", [sem, padrao]);
    expect(Object.fromEntries((data ?? []).map((r) => [r.id, r.com_fecho]))).toEqual({ [sem]: false, [padrao]: true });
  });
});

describe("biblioteca: filtros por produto e status (critério 8.8)", () => {
  it("filtra por produto, por status e por 'em andamento'", async () => {
    const p1 = await approvedProduct();
    const p2 = await approvedProduct();
    ai.scriptFails = true;
    const { anuncioId: falhou } = await createAd(actor, input(p1));
    ai.scriptFails = false;
    const { anuncioId: gerando } = await createAd(actor, input(p2));

    const ids = async (f: Parameters<typeof listAds>[1]) => (await listAds(marcaId, f)).map((a) => a.id);
    expect(await ids({ produtoId: p1 })).toEqual([falhou]);
    expect(await ids({ produtoId: p2 })).toEqual([gerando]);
    expect(await ids({ produtoId: p1, status: "falhou" })).toEqual([falhou]);
    expect(await ids({ produtoId: p2, status: "andamento" })).toEqual([gerando]);
    expect(await ids({ produtoId: p2, status: "pronto" })).toEqual([]);
  });
});

describe("anúncio com personagem do catálogo (MD-17)", () => {
  /** Personagem com ficha aprovada (imagem real no Storage local). */
  async function approvedCharacter(marca = marcaId, aprovar = true): Promise<string> {
    const { data: p } = await db.from("personagens").insert({ marca_id: marca, nome: `Ana ${sfx}`, genero_modelo: "mulher", faixa_etaria: "de_30_a_45", criado_por: actor.id, modelo_en: "Woman in her 30s, short platinum hair, freckles, athletic build." }).select("id").single();
    const object = `${marca}/personagens/${p!.id}/fichas/v1-teste.png`;
    await db.storage.from("produtos").upload(object, PNG, { contentType: "image/png", upsert: true });
    const { data: f } = await db.from("fichas_personagem").insert({ personagem_id: p!.id, marca_id: marca, versao: 1, status: "aguardando_aprovacao", imagem_path: `produtos/${object}` }).select("id").single();
    if (aprovar) await db.rpc("aprovar_ficha_personagem", { p_ficha_id: f!.id });
    return p!.id;
  }

  it("usa a modelo do catálogo e manda 2 referências (peça + personagem) em cada cena", async () => {
    const produto = await approvedProduct();
    const personagem = await approvedCharacter();
    const from = hf.submitted.length;
    const { anuncioId } = await createAd(actor, input(produto, { personagem_id: personagem, genero_modelo: "homem", faixa_etaria: "de_20_a_30" }));
    const { data: ad } = await db.from("anuncios").select("personagem_id, genero_modelo, faixa_etaria, roteiro").eq("id", anuncioId).single();
    expect(ad!.personagem_id).toBe(personagem);
    // Gênero e idade vêm da personagem, não do formulário.
    expect([ad!.genero_modelo, ad!.faixa_etaria]).toEqual(["mulher", "de_30_a_45"]);
    expect((ad!.roteiro as Script).modelo).toBe("Woman in her 30s, short platinum hair, freckles, athletic build.");
    const frames = hf.submitted.slice(from);
    expect(frames).toHaveLength(3);
    for (const s of frames) {
      expect(s.body.image_urls).toHaveLength(2);
      expect(String(s.body.prompt)).toContain("Reference image 2 is the character sheet");
      expect(String(s.body.prompt)).toContain("short platinum hair");
    }
  });

  it("personagem sem ficha aprovada ou de outra marca é recusada sem débito", async () => {
    const produto = await approvedProduct();
    const semFicha = await approvedCharacter(marcaId, false);
    const daOutra = await approvedCharacter(outraMarcaId);
    const antes = await saldo();
    expect(businessCodeOf(await createAd(actor, input(produto, { personagem_id: semFicha })).catch((e) => e))).toBe("personagem_sem_ficha");
    expect(businessCodeOf(await createAd(actor, input(produto, { personagem_id: daOutra })).catch((e) => e))).toBe("personagem_inexistente");
    expect(await saldo()).toBe(antes);
  });
});
