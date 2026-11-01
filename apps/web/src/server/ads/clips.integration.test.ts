import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertLocalSupabase } from "@/test/local-db";
import { higgsfieldHeaders } from "@/test/higgsfield";
import { createAdminClient } from "../db/supabase";
import { businessCodeOf } from "../api/http";
import type { AiClient, FrameQc, Script } from "../claude/types";
import { CLAUSULA_VIDEO } from "../prompts/clauses";
import { setGenerationDepsForTests, type GenerationDeps } from "../higgsfield/process";
import { handleHiggsfieldWebhook } from "../higgsfield/webhook";
import { ffmpegPath, ffprobeInfo } from "../video/assemble";
import webhookCompleted from "../higgsfield/__fixtures__/webhook-completed.json";
import webhookVideo from "../higgsfield/__fixtures__/webhook-completed-video.json";
import webhookFailed from "../higgsfield/__fixtures__/webhook-failed.json";
import { setAiClientForTests } from "./runtime";
import { createAd, downloadAd, getAdView, patchAdTexts, type AdActor } from "./service";
import { downloadName, redoClip, selectClip, startVideo } from "./clips";
import { redoFrame, selectFrame } from "./frames";

/**
 * Critérios dos épicos 8.6 e 8.7 (seções 11.2.4, 11.8, 12.2 e 13) contra o Supabase local, com dublês
 * do Claude e da Higgsfield (o Seedance devolve um MP4 `testsrc` de verdade, para a montagem com
 * ffmpeg rodar de ponta a ponta — D-23).
 */
assertLocalSupabase();
const db = createAdminClient();
const sfx = Date.now().toString(36);
const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
const dir = mkdtempSync(join(tmpdir(), "adfit-clips-"));
const MP4 = (() => {
  const out = join(dir, "clip.mp4");
  execFileSync(ffmpegPath(), ["-y", "-f", "lavfi", "-i", "testsrc=size=540x960:rate=24:duration=5.1", "-pix_fmt", "yuv420p", out], { stdio: "ignore" });
  return new Uint8Array(readFileSync(out));
})();
let marcaId = "";
let outraMarcaId = "";
let actor: AdActor;
let seq = 0;

const SCRIPT: Script = {
  conceito: "c",
  modelo: "Man in his 30s, short black hair",
  cenas: [1, 2, 3].map((ordem) => ({ ordem: ordem as 1 | 2 | 3, descricao: `Cena ${ordem}`, prompt_quadro: `Frame ${ordem}, gym`, prompt_movimento: `Slow push-in ${ordem}, chest rising`, texto_tela: ordem === 3 ? null : `Texto ${ordem}` })),
};
const GOOD: FrameQc = { fidelidade_peca: 9, logo_visivel_correto: 9, anatomia: 9, texto_espurio: false, conteudo_improprio: false, motivo: "" };
const ai: AiClient = {
  adjustPrompt: async (i) => ({ prompt: `${i.promptAtual} — adjusted`, resumo_pt: "ajustado" }),
  writeScript: async () => structuredClone(SCRIPT),
  checkFrame: async () => GOOD,
  reviewTexts: async ({ textos }) => ({ textos: textos.map((_, i) => ({ indice: i, problema: false, sugestao: null })) }),
};

type FakeHf = GenerationDeps & { submitted: Array<{ endpoint: string; body: Record<string, unknown>; requestId: string }> };
function fakeHf(): FakeHf {
  const fake: FakeHf = {
    submitted: [],
    hf: {
      submit: async (endpoint, body) => {
        const requestId = `REQ_CLIP_${sfx}_${++seq}`;
        fake.submitted.push({ endpoint, body, requestId });
        return { request_id: requestId };
      },
      status: async (id) => ({ request_id: id, status: "in_progress" }),
      uploadInput: async () => `https://cdn.higgsfield.ai/inputs/${sfx}.jpg`,
    },
    download: async (url) => (url.endsWith(".mp4") ? { bytes: MP4, contentType: "video/mp4" } : { bytes: PNG, contentType: "image/png" }),
  };
  return fake;
}
let hf: FakeHf;
const deliver = (fixture: object, requestId: string) => {
  const body = JSON.stringify(fixture).replaceAll("REQUEST_ID", requestId);
  return handleHiggsfieldWebhook(process.env.HF_WEBHOOK_TOKEN!, higgsfieldHeaders(body), body);
};
const saldo = async () => (await db.from("marcas").select("saldo_creditos").eq("id", marcaId).single()).data!.saldo_creditos;
/** Preço atual de uma ação (o admin muda sem deploy; os testes não fixam o valor). */
const preco = async (acao: "gerar_video" | "refazer_clipe") => (await db.from("precos_acoes").select("creditos").eq("acao", acao).single()).data!.creditos;
const status = async (id: string) => (await db.from("anuncios").select("status").eq("id", id).single()).data!.status;

/** Anúncio pronto para gerar vídeo (3 quadros aprovados). */
async function readyAd(): Promise<{ id: string; cenas: Array<{ id: string; ordem: number }> }> {
  const { data: p } = await db.from("produtos").insert({ marca_id: marcaId, nome: `Bermuda ${sfx}`, categoria: "shorts" }).select("id").single();
  const object = `${marcaId}/${p!.id}/fichas/v1-teste.png`;
  await db.storage.from("produtos").upload(object, PNG, { contentType: "image/png", upsert: true });
  const { data: f } = await db.from("fichas_produto").insert({ produto_id: p!.id, marca_id: marcaId, versao: 1, status: "aguardando_aprovacao", imagem_path: `produtos/${object}` }).select("id").single();
  await db.rpc("aprovar_ficha", { p_ficha_id: f!.id });
  const from = hf.submitted.length;
  const { anuncioId } = await createAd(actor, { produto_id: p!.id, cenario: "box_crossfit", modalidade: "crossfit", genero_modelo: "homem", faixa_etaria: "de_30_a_45", estilo: "energetico", formato: "vertical_9_16", com_texto: true });
  for (const s of hf.submitted.slice(from)) await deliver(webhookCompleted, s.requestId);
  expect(await status(anuncioId)).toBe("aguardando_aprovacao");
  const { data: cenas } = await db.from("cenas").select("id, ordem").eq("anuncio_id", anuncioId).order("ordem");
  return { id: anuncioId, cenas: cenas! };
}

beforeAll(async () => {
  const { data: m } = await db.from("marcas").insert({ nome: `Marca vídeo ${sfx}`, instagram: `video_${sfx}`, cor_destaque: "#C6F432" }).select("id").single();
  const { data: o } = await db.from("marcas").insert({ nome: `Outra vídeo ${sfx}` }).select("id").single();
  marcaId = m!.id;
  outraMarcaId = o!.id;
  const { data: u } = await db.auth.admin.createUser({ email: `video_${sfx}@kore.test`, password: `x-${sfx}-senha`, email_confirm: true });
  await db.from("perfis").insert({ id: u.user!.id, marca_id: marcaId, nome: "Lojista", email: `video_${sfx}@kore.test` });
  actor = { id: u.user!.id, papel: "usuario_marca", marcaId, idioma: "pt_br" };
  await db.rpc("lancar_creditos", { p_marca_id: marcaId, p_tipo: "bonus", p_quantidade: 400, p_valor_pago_centavos: null as never, p_observacao: "teste 8.6", p_criado_por: null as never });
});
beforeEach(() => {
  hf = fakeHf();
  setGenerationDepsForTests(hf);
  setAiClientForTests(ai);
});
afterAll(() => {
  setGenerationDepsForTests(null);
  setAiClientForTests(null);
});

describe("8.6 — gerar vídeo", () => {
  it("debita gerar_video uma vez, submete 3 clipes de 5 s no Seedance e, com os 3 prontos, monta o vídeo de 15 s", async () => {
    const ad = await readyAd();
    const antes = await saldo();
    const from = hf.submitted.length;
    const video = await preco("gerar_video");
    await startVideo(actor, ad.id);
    expect(await saldo()).toBe(antes - video);
    expect(await status(ad.id)).toBe("gerando_clipes");
    const clips = hf.submitted.slice(from);
    expect(clips).toHaveLength(3);
    for (const c of clips) {
      expect(c.endpoint).toBe("bytedance/seedance-2.5/image-to-video");
      expect(c.body).toMatchObject({ duration: 5, resolution: "1080p", generate_audio: false, image_url: expect.stringContaining("cdn.higgsfield.ai") });
      expect(String(c.body.prompt).endsWith(CLAUSULA_VIDEO)).toBe(true);
      expect(String(c.body.prompt)).not.toMatch(/chest/i);
    }
    // Repetir o pedido não debita de novo.
    expect(businessCodeOf(await startVideo(actor, ad.id).catch((e) => e))).toBe("transicao_invalida");
    expect(await saldo()).toBe(antes - video);

    for (const c of clips) await deliver(webhookVideo, c.requestId);
    expect(await status(ad.id)).toBe("pronto");
    const { data: row } = await db.from("anuncios").select("video_final_path, versao_montagem").eq("id", ad.id).single();
    expect(row).toMatchObject({ versao_montagem: 1, video_final_path: `anuncios/${marcaId}/${ad.id}/video/v1.mp4` });
    const { data: file } = await db.storage.from("anuncios").download(row!.video_final_path!.replace(/^anuncios\//, ""));
    const out = join(dir, `final-${ad.id}.mp4`);
    (await import("node:fs")).writeFileSync(out, Buffer.from(await file!.arrayBuffer()));
    const info = ffprobeInfo(out);
    expect(info.duration).toBeGreaterThan(14.8);
    expect(info.duration).toBeLessThan(15.2);
    expect(info.video).toMatchObject({ width: 1080, height: 1920, fps: 30 });
    const { data: custo } = await db.from("geracoes").select("custo_usd").eq("request_id", clips[0].requestId).single();
    const { data: cfg } = await db.from("configuracoes").select("valor").eq("chave", "preco_usd_por_segundo_video").single();
    expect(Number(custo!.custo_usd)).toBeCloseTo(Number(cfg!.valor) * 5, 3);

    // 8.7: download com o nome da regra; outra marca não baixa.
    const dl = await downloadAd(actor, ad.id);
    expect(dl.nome).toBe(`video_${sfx}_bermuda-${sfx}_9x16_v1.mp4`);
    const outro: AdActor = { id: actor.id, papel: "usuario_marca", marcaId: outraMarcaId, idioma: "pt_br" };
    expect(businessCodeOf(await downloadAd(outro, ad.id).catch((e) => e))).toBe("anuncio_inexistente");

    // 8.7: editar texto com o vídeo pronto remonta de graça (versao_montagem 2).
    const semCusto = await saldo();
    await patchAdTexts(actor, ad.id, { cenas: [{ id: ad.cenas[0].id, texto_tela: "Novo texto" }] });
    expect(await status(ad.id)).toBe("pronto");
    expect((await db.from("anuncios").select("versao_montagem").eq("id", ad.id).single()).data!.versao_montagem).toBe(2);
    expect(await saldo()).toBe(semCusto);
  }, 120_000);

  it("cena que falha 2 vezes: estorno de floor(preço/3) só dela, volta a aguardar; 'Tentar de novo' cobra refazer_clipe e fecha o vídeo", async () => {
    const ad = await readyAd();
    const antes = await saldo();
    const [video, refazer] = [await preco("gerar_video"), await preco("refazer_clipe")];
    const from = hf.submitted.length;
    await startVideo(actor, ad.id);
    const [c1, c2, c3] = hf.submitted.slice(from);
    await deliver(webhookVideo, c1.requestId);
    await deliver(webhookVideo, c2.requestId);
    await deliver(webhookFailed, c3.requestId);
    const retry = hf.submitted.at(-1)!;
    await deliver(webhookFailed, retry.requestId);
    expect(await status(ad.id)).toBe("aguardando_aprovacao");
    expect(await saldo()).toBe(antes - video + Math.floor(video / 3));

    // Os clipes saem em paralelo: acha a cena que falhou de fato.
    const { data: failed } = await db.from("clipes").select("cena_id").eq("status", "falhou").in("cena_id", ad.cenas.map((c) => c.id)).single();
    await redoClip(actor, failed!.cena_id, undefined);
    expect(await saldo()).toBe(antes - video + Math.floor(video / 3) - refazer);
    expect(await status(ad.id)).toBe("gerando_clipes");
    await deliver(webhookVideo, hf.submitted.at(-1)!.requestId);
    expect(await status(ad.id)).toBe("pronto");
  }, 120_000);

  it("não gera vídeo com cena sem imagem pronta, nem fora de aguardando_aprovacao, nem de outra marca", async () => {
    const ad = await readyAd();
    await db.from("cenas").update({ quadro_atual_id: null }).eq("id", ad.cenas[1].id);
    expect(businessCodeOf(await startVideo(actor, ad.id).catch((e) => e))).toBe("cenas_incompletas");
    const outro: AdActor = { id: actor.id, papel: "usuario_marca", marcaId: outraMarcaId, idioma: "pt_br" };
    expect(businessCodeOf(await startVideo(outro, ad.id).catch((e) => e))).toBe("anuncio_inexistente");
  }, 60_000);
});

describe("8.6 — refazer e usar imagem", () => {
  it("refazer imagem cobra refazer_quadro, cria a versão 2 com o QC e 'usar esta' troca a imagem atual", async () => {
    const ad = await readyAd();
    const antes = await saldo();
    await redoFrame(actor, ad.cenas[0].id, "mostrar mais o logo");
    expect(await saldo()).toBe(antes - 1);
    await deliver(webhookCompleted, hf.submitted.at(-1)!.requestId);
    const view = await getAdView(actor, ad.id);
    const cena = view.cenas[0];
    expect(cena.quadros.map((q) => q.status)).toEqual(["pronto", "pronto"]);
    expect(cena.quadroAtualId).toBe(cena.quadros[0].id);
    await selectFrame(actor, cena.id, cena.quadros[1].id);
    expect((await getAdView(actor, ad.id)).cenas[0].quadroAtualId).toBe(cena.quadros[1].id);
  }, 60_000);

  it("cena que só tem imagem falhada: tentar de novo é grátis (D-18)", async () => {
    const ad = await readyAd();
    await db.from("quadros").update({ status: "falhou" }).eq("cena_id", ad.cenas[1].id);
    await db.from("cenas").update({ quadro_atual_id: null }).eq("id", ad.cenas[1].id);
    const antes = await saldo();
    await redoFrame(actor, ad.cenas[1].id, undefined);
    expect(await saldo()).toBe(antes);
    await deliver(webhookCompleted, hf.submitted.at(-1)!.requestId);
    expect((await getAdView(actor, ad.id)).cenas[1].quadroAtualId).toBeTruthy();
  }, 60_000);

  it("usar versão anterior do clipe com o vídeo pronto remonta de graça", async () => {
    const ad = await readyAd();
    const from = hf.submitted.length;
    await startVideo(actor, ad.id);
    for (const c of hf.submitted.slice(from)) await deliver(webhookVideo, c.requestId);
    await redoClip(actor, ad.cenas[0].id, "mais lento");
    await deliver(webhookVideo, hf.submitted.at(-1)!.requestId);
    expect(await status(ad.id)).toBe("pronto");
    const antes = await saldo();
    const view = await getAdView(actor, ad.id);
    const first = view.cenas[0].clipes[0];
    await selectClip(actor, ad.cenas[0].id, first.id);
    expect(await status(ad.id)).toBe("pronto");
    const { data } = await db.from("anuncios").select("versao_montagem").eq("id", ad.id).single();
    expect(data!.versao_montagem).toBe(3);
    expect(await saldo()).toBe(antes);
  }, 120_000);
});

describe("8.7 — nome do arquivo", () => {
  it("sem acento e sem espaço; usa o @ quando existe, senão o nome da marca", () => {
    expect(downloadName({ instagram: "kore_active", nome: "Kore" }, "Top Kore Preto", "vertical_9_16", 2)).toBe("kore_active_top-kore-preto_9x16_v2.mp4");
    expect(downloadName({ instagram: null, nome: "Marca Ótima Ltda." }, "Bermuda Masculina", "horizontal_16_9", 1)).toBe("marca_otima_ltda_bermuda-masculina_16x9_v1.mp4");
  });
});
