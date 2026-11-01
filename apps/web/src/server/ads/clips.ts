import "server-only";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { createAdminClient } from "../db/supabase";
import { BusinessError } from "../api/http";
import { readConfig } from "../config";
import { CLAUSULA_AUDIO, CLAUSULA_VIDEO } from "../prompts/clauses";
import { appendShortcutLines, redoRequest, type RedoInput } from "../prompts/redo-shortcuts";
import { brandObject } from "../storage";
import { generationDeps, submitGeneration, type GenerationDeps, type GenerationInput, type GenerationRow, type GenerationTarget } from "../higgsfield/process";
import { assembleVideo } from "../video/assemble";
import type { PromptAdjuster } from "../claude/types";
import { AD_BUCKET } from "@/lib/storage-paths";
import { aiClient, runLater } from "./runtime";
import { stripBodyTerms } from "./frames";
import { transition, type AdStatus } from "./stateMachine";
import { emailOf, track } from "../analytics/track";
import { assertProviderAvailable } from "../higgsfield/provider-health";

/** Prompt do clipe pelo CÓDIGO (Anexo C.2): `prompt_movimento` + `CLAUSULA_AUDIO` (MD-11) + `CLAUSULA_VIDEO` sempre no fim, sem termos de corpo. */
export function buildClipPrompt(promptMovimento: string): string {
  return `${stripBodyTerms(promptMovimento.replace(CLAUSULA_VIDEO, "").replace(CLAUSULA_AUDIO, "").trim())}\n${CLAUSULA_AUDIO}\n${CLAUSULA_VIDEO}`;
}

type Actor = { id: string; papel: "admin_plataforma" | "usuario_marca"; marcaId: string | null; email?: string };

function assertOwner(actor: Actor, marcaId: string): void {
  if (actor.papel !== "admin_plataforma" && actor.marcaId !== marcaId) throw new BusinessError("anuncio_inexistente");
}

/** Alvo `clipes` de uma geração `clipe_video` (épico 8.6). */
export async function clipTarget(g: GenerationRow): Promise<GenerationTarget | null> {
  const db = createAdminClient();
  const { data: clip } = await db.from("clipes").select("id, versao, cena_id, cenas!clipes_cena_id_fkey(ordem, anuncio_id)").eq("geracao_id", g.id).maybeSingle();
  if (!clip) return null;
  const cena = clip.cenas as unknown as { ordem: number; anuncio_id: string };
  return {
    table: "clipes",
    id: clip.id,
    path: (ext) => `${AD_BUCKET}/${g.marca_id}/${cena.anuncio_id}/clipes/c${cena.ordem}-v${clip.versao}-${g.id}.${ext}`,
    // Clipe pronto vira o atual da cena (12.4) e confere o fechamento dos clipes.
    afterStored: async (gen, path) => {
      const { data } = await db.from("clipes").update({ video_path: path, status: "pronto" }).eq("id", clip.id).eq("geracao_id", gen.id).eq("status", "gerando").select("id");
      if (data?.length) await db.from("cenas").update({ clipe_atual_id: clip.id }).eq("id", clip.cena_id);
      await checkClipsProgress(cena.anuncio_id);
    },
    // Falha definitiva: clipe `falhou` + estorno proporcional da cena (11.2.4) e fechamento.
    afterFinalFailure: async (gen) => {
      const { data } = await db.from("clipes").update({ status: "falhou" }).eq("id", clip.id).eq("geracao_id", gen.id).eq("status", "gerando").select("id");
      if (data?.length && gen.cobranca_id) await refundScene(gen.cobranca_id, clip.id, cena.ordem);
      await checkClipsProgress(cena.anuncio_id);
    },
  };
}

/**
 * Estorno de uma cena (regra 11.2.4): `floor(débito / 3)` créditos do `gerar_video` (ou o valor inteiro
 * de um `refazer_clipe`, que cobre uma cena só), referenciando o clipe (7.3). Idempotente por consumo+clipe.
 */
async function refundScene(cobrancaId: string, clipeId: string, ordem: number): Promise<void> {
  const db = createAdminClient();
  const { data: consumo } = await db.from("movimentacoes_creditos").select("quantidade, acao").eq("id", cobrancaId).single();
  if (!consumo) return;
  const total = -consumo.quantidade;
  const quantidade = consumo.acao === "gerar_video" ? Math.floor(total / 3) : total;
  if (quantidade < 1) return;
  const { error } = await db.rpc("estornar_creditos", {
    p_movimentacao_id: cobrancaId,
    p_observacao: `Falha técnica ao animar a cena ${ordem}`,
    p_quantidade: quantidade,
    p_referencia_tipo: "clipe",
    p_referencia_id: clipeId,
  });
  if (error && error.message !== "ja_estornado") throw error;
}

/**
 * Cria e submete um clipe da cena a partir do quadro atual (8.6): nova versão `gerando`, geração
 * `clipe_video` com o modelo de `configuracoes.modelo_video`, o mesmo consumo (`cobrancaId`).
 */
async function createClip(cena: { id: string; marca_id: string; quadro_atual_id: string; prompt_movimento: string }, cobrancaId: string | null, promptMovimento: string, instrucao: string | null, deps: GenerationDeps, clipeId: string = randomUUID()): Promise<void> {
  const db = createAdminClient();
  const { data: quadro } = await db.from("quadros").select("imagem_path").eq("id", cena.quadro_atual_id).single();
  const { data: prev } = await db.from("clipes").select("versao").eq("cena_id", cena.id).order("versao", { ascending: false }).limit(1).maybeSingle();
  const { modelo_video } = await readConfig(["modelo_video"]);
  const entrada: GenerationInput & { prompt_movimento: string } = {
    prompt: buildClipPrompt(promptMovimento),
    prompt_base: promptMovimento,
    prompt_versao: "clipe.v1",
    referencias: [quadro!.imagem_path!],
    aspect_ratio: "9:16",
    prompt_movimento: promptMovimento,
  };
  const { data: g, error } = await db.from("geracoes").insert({ marca_id: cena.marca_id, tipo: "clipe_video", modelo: String(modelo_video), entrada: entrada as never, cobranca_id: cobrancaId }).select("id").single();
  if (error) throw error;
  const { error: cErr } = await db.from("clipes").insert({ id: clipeId, cena_id: cena.id, marca_id: cena.marca_id, quadro_id: cena.quadro_atual_id, versao: (prev?.versao ?? 0) + 1, status: "gerando", geracao_id: g.id, instrucao_refacao: instrucao });
  if (cErr) throw cErr;
  await submitGeneration(g.id, deps);
}

/**
 * POST /api/anuncios/:id/gerar-video (seção 13; critérios 8.6): anúncio em `aguardando_aprovacao`, as 3
 * cenas com quadro atual `pronto` e nenhum quadro em geração. Debita `gerar_video` UMA vez (11.2.1),
 * leva a `gerando_clipes` e submete os 3 clipes de 5 s. Recebe: ator e anúncio. Devolve: nada.
 */
export async function startVideo(actor: Actor, anuncioId: string, deps: { generation?: GenerationDeps } = {}): Promise<void> {
  const db = createAdminClient();
  const { data: ad } = await db.from("anuncios").select("id, marca_id, status, arquivado").eq("id", anuncioId).maybeSingle();
  if (!ad || ad.arquivado) throw new BusinessError("anuncio_inexistente");
  assertOwner(actor, ad.marca_id);
  if (ad.status !== "aguardando_aprovacao") throw new BusinessError("transicao_invalida");
  const { data: cenas } = await db
    .from("cenas")
    .select("id, ordem, marca_id, quadro_atual_id, prompt_movimento, quadros!quadros_cena_id_fkey(id, status)")
    .eq("anuncio_id", anuncioId)
    .order("ordem");
  const ok =
    cenas?.length === 3 &&
    cenas.every((c) => {
      const qs = (c.quadros ?? []) as Array<{ id: string; status: string }>;
      return c.quadro_atual_id && qs.some((q) => q.id === c.quadro_atual_id && q.status === "pronto") && !qs.some((q) => q.status === "gerando");
    });
  if (!ok) throw new BusinessError("cenas_incompletas");

  // Saldo da Higgsfield esgotado: barra antes de cobrar (pedido do Alexandre, 01/11/2026).
  await assertProviderAvailable();
  const { data: cobrancaId, error: debitErr } = await db.rpc("debitar_creditos", {
    p_marca_id: ad.marca_id,
    p_acao: "gerar_video",
    p_quantidade_itens: 1,
    p_referencia_tipo: "anuncio",
    p_referencia_id: anuncioId,
    p_criado_por: actor.id,
  });
  if (debitErr) throw debitErr;
  if (!(await transition(anuncioId, "aguardando_aprovacao", "gerando_clipes"))) {
    if (cobrancaId) await db.rpc("estornar_creditos", { p_movimentacao_id: cobrancaId, p_observacao: "Pedido de vídeo repetido" });
    throw new BusinessError("transicao_invalida");
  }
  const generation = deps.generation ?? generationDeps();
  await Promise.all(cenas!.map((c) => createClip({ id: c.id, marca_id: c.marca_id, quadro_atual_id: c.quadro_atual_id!, prompt_movimento: c.prompt_movimento }, cobrancaId, c.prompt_movimento, null, generation)));
  await track({ nome: "adfit_video_solicitado", distinctId: actor.email ?? "", tela: "Anúncio", descricao: "pediu para gerar o vídeo (animar as 3 cenas)", propriedades: { anuncio_id: anuncioId } });
}

/**
 * POST /api/cenas/:id/refazer-clipe (seção 13; 8.6/8.7): anúncio `pronto` ou `aguardando_aprovacao`
 * depois de uma cena falhar. Debita `refazer_clipe`; instrução opcional passa pelo Claude (C.3, tipo
 * clipe); nova versão do clipe a partir do quadro atual. Recebe: ator, cena e instrução.
 */
export async function redoClip(actor: Actor, cenaId: string, instrucao: RedoInput, deps: { generation?: GenerationDeps; adjuster?: PromptAdjuster } = {}): Promise<void> {
  const db = createAdminClient();
  const { data: cena } = await db.from("cenas").select("id, ordem, marca_id, anuncio_id, quadro_atual_id, prompt_movimento, clipes!clipes_cena_id_fkey(status)").eq("id", cenaId).maybeSingle();
  if (!cena) throw new BusinessError("anuncio_inexistente");
  assertOwner(actor, cena.marca_id);
  const { data: ad } = await db.from("anuncios").select("status").eq("id", cena.anuncio_id).single();
  const from = ad!.status as AdStatus;
  const clips = (cena.clipes ?? []) as Array<{ status: string }>;
  if (!(from === "pronto" || (from === "aguardando_aprovacao" && clips.length > 0)) || !cena.quadro_atual_id) throw new BusinessError("transicao_invalida");

  const clipeId = randomUUID();
  // Saldo da Higgsfield esgotado: barra antes de cobrar (pedido do Alexandre, 01/11/2026).
  await assertProviderAvailable();
  const { data: cobrancaId, error: debitErr } = await db.rpc("debitar_creditos", {
    p_marca_id: cena.marca_id,
    p_acao: "refazer_clipe",
    p_quantidade_itens: 1,
    p_referencia_tipo: "clipe",
    p_referencia_id: clipeId,
    p_criado_por: actor.id,
  });
  if (debitErr) throw debitErr;
  if (!(await transition(cena.anuncio_id, from, "gerando_clipes"))) {
    if (cobrancaId) await db.rpc("estornar_creditos", { p_movimentacao_id: cobrancaId, p_observacao: "Pedido repetido" });
    throw new BusinessError("transicao_invalida");
  }
  let prompt = cena.prompt_movimento;
  const redo = redoRequest("clipe", instrucao);
  const pedido = redo.pedido;
  if (pedido) {
    try {
      prompt = (await (deps.adjuster ?? aiClient()).adjustPrompt({ tipo: "clipe", promptAtual: cena.prompt_movimento, pedido })).prompt;
    } catch (e) {
      console.error("Refação de clipe sem ajuste do Claude:", e instanceof Error ? e.message : e);
    }
  }
  // Atalhos: linhas fixas acrescentadas pelo código, mesmo se o Claude falhar.
  prompt = appendShortcutLines(prompt, redo.linhas);
  await createClip({ id: cena.id, marca_id: cena.marca_id, quadro_atual_id: cena.quadro_atual_id, prompt_movimento: cena.prompt_movimento }, cobrancaId, prompt, redo.registro || null, deps.generation ?? generationDeps(), clipeId);
}

/**
 * POST /api/cenas/:id/usar-clipe (seção 13; 8.7): clipe `pronto` da mesma cena; anúncio `pronto` →
 * `montando` e remonta de graça (versao_montagem++). Recebe: ator, cena e clipe.
 */
export async function selectClip(actor: Actor, cenaId: string, clipeId: string): Promise<void> {
  const db = createAdminClient();
  const { data: clip } = await db.from("clipes").select("id, status, cena_id, marca_id, cenas!clipes_cena_id_fkey(anuncio_id)").eq("id", clipeId).maybeSingle();
  if (!clip || clip.cena_id !== cenaId) throw new BusinessError("anuncio_inexistente");
  assertOwner(actor, clip.marca_id);
  if (clip.status !== "pronto") throw new BusinessError("transicao_invalida");
  const anuncioId = (clip.cenas as unknown as { anuncio_id: string }).anuncio_id;
  const { data: ad } = await db.from("anuncios").select("status").eq("id", anuncioId).single();
  if (ad?.status !== "pronto") throw new BusinessError("transicao_invalida");
  await db.from("cenas").update({ clipe_atual_id: clipeId }).eq("id", cenaId);
  await requestMontage(anuncioId, "pronto");
}

/** Leva o anúncio a `montando` (de `pronto` ou `gerando_clipes`) e agenda a montagem fora da resposta. */
export async function requestMontage(anuncioId: string, from: "pronto" | "gerando_clipes"): Promise<boolean> {
  const ok = await transition(anuncioId, from, "montando", { montagem_iniciada_em: null, tentativas_montagem: 0, erro: null });
  if (ok) await runLater(() => runMontage(anuncioId));
  return ok;
}

/**
 * Fechamento dos clipes (seção 12.2; critérios 8.6), quando a versão mais recente do clipe de cada
 * cena está final: 3 prontos → `montando` + montagem; alguma cena falhou → `aguardando_aprovacao`
 * (a tela mostra "Não conseguimos animar a cena X" e "Tentar de novo"). Idempotente.
 */
export async function checkClipsProgress(anuncioId: string): Promise<void> {
  const db = createAdminClient();
  const { data: ad } = await db.from("anuncios").select("status").eq("id", anuncioId).maybeSingle();
  if (ad?.status !== "gerando_clipes") return;
  const { data: cenas } = await db.from("cenas").select("id, clipe_atual_id, clipes!clipes_cena_id_fkey(id, versao, status)").eq("anuncio_id", anuncioId);
  if (!cenas || cenas.length !== 3) return;
  const latest = cenas.map((c) => [...((c.clipes ?? []) as Array<{ id: string; versao: number; status: string }>)].sort((a, b) => b.versao - a.versao)[0]);
  if (latest.some((l) => !l || l.status === "gerando")) return;
  if (cenas.every((c, i) => latest[i].status === "pronto" && c.clipe_atual_id === latest[i].id)) {
    await requestMontage(anuncioId, "gerando_clipes");
    return;
  }
  await transition(anuncioId, "gerando_clipes", "aguardando_aprovacao");
}

/**
 * Varredura de clipes órfãos (bug B-14; regra 11.2): anúncio em `gerando_clipes` há mais que o tempo
 * de órfão, com débito feito e clipe nunca criado (função encerrada entre o débito e a criação).
 * - "Gerar vídeo": cena sem clipe depois do débito → clipe `falhou` + estorno da parte da cena.
 * - "Refazer cena": débito de `refazer_clipe` cujo clipe não existe → estorno integral.
 * Idempotente (`estornar_creditos` recusa estorno repetido). Recebe: anúncio. Devolve: nada.
 */
export async function sweepOrphanClips(anuncioId: string, now = Date.now(), orphanAfterMs = 6 * 60_000): Promise<void> {
  const db = createAdminClient();
  const { data: cenas } = await db.from("cenas").select("id, ordem, marca_id, quadro_atual_id, clipes!clipes_cena_id_fkey(id, versao, criado_em)").eq("anuncio_id", anuncioId);
  if (!cenas?.length) return;
  const { data: video } = await db
    .from("movimentacoes_creditos")
    .select("id, criado_em")
    .eq("tipo", "consumo")
    .eq("acao", "gerar_video")
    .eq("referencia_tipo", "anuncio")
    .eq("referencia_id", anuncioId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (video) {
    for (const c of cenas) {
      const clips = (c.clipes ?? []) as Array<{ id: string; versao: number; criado_em: string }>;
      if (!c.quadro_atual_id || clips.some((k) => k.criado_em >= video.criado_em)) continue;
      const clipeId = randomUUID();
      const versao = Math.max(0, ...clips.map((k) => k.versao)) + 1;
      const { error } = await db.from("clipes").insert({ id: clipeId, cena_id: c.id, marca_id: c.marca_id, quadro_id: c.quadro_atual_id, versao, status: "falhou" });
      if (error) console.error("Clipe órfão não registrado:", error.message);
      if (!error) await refundScene(video.id, clipeId, c.ordem);
    }
  }
  const allClipIds = new Set(cenas.flatMap((c) => ((c.clipes ?? []) as Array<{ id: string }>).map((k) => k.id)));
  const { data: redos } = await db
    .from("movimentacoes_creditos")
    .select("id, referencia_id")
    .eq("tipo", "consumo")
    .eq("acao", "refazer_clipe")
    .eq("marca_id", cenas[0].marca_id)
    .eq("referencia_tipo", "clipe")
    .gte("criado_em", new Date(now - 24 * 3_600_000).toISOString())
    // Só débitos antigos: um refazer de outro anúncio feito há segundos ainda pode estar criando o clipe.
    .lte("criado_em", new Date(now - orphanAfterMs).toISOString());
  // Débito de refazer sem o clipe dele depois do tempo de órfão: estorna (seja de qual anúncio for).
  for (const r of redos ?? []) {
    if (!r.referencia_id || allClipIds.has(r.referencia_id)) continue;
    const { data: exists } = await db.from("clipes").select("id").eq("id", r.referencia_id).maybeSingle();
    if (exists) continue;
    const { error } = await db.rpc("estornar_creditos", { p_movimentacao_id: r.id, p_observacao: "Falha técnica ao refazer a cena" });
    if (error && error.message !== "ja_estornado") throw error;
  }
}

/** Nome do arquivo baixado (critério 8.7): `<instagram-ou-marca>_<produto>_<formato>_v<n>.mp4`, sem acento/espaço. */
export function downloadName(marca: { instagram: string | null; nome: string }, produto: string, formato: string, versao: number): string {
  const slug = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const brand = marca.instagram ? marca.instagram.toLowerCase().replace(/[^a-z0-9_]+/g, "_") : slug(marca.nome).replace(/-/g, "_");
  return `${brand}_${slug(produto)}_${formato === "horizontal_16_9" ? "16x9" : "9x16"}_v${versao}.mp4`;
}

/** Montagem em andamento há mais que isso é considerada parada (seção 23; D-3). */
export const MONTAGE_STALE_MS = 10 * 60_000;

/**
 * Montagem do vídeo final (regra 11.8; D-23: ffmpeg na própria Vercel). Reivindica o anúncio por update
 * condicional (`montando`, menos de 3 tentativas, sem montagem em andamento há menos de 10 min — D-3),
 * baixa os 3 clipes atuais e o logo, monta, grava `anuncios/<marca>/<anuncio>/video/v<n>.mp4`, soma
 * `versao_montagem` e leva a `pronto`. Erro → `erro` preenchido; a varredura tenta de novo (até 3).
 * Recebe: anúncio. Devolve: nada.
 */
export async function runMontage(anuncioId: string): Promise<void> {
  const db = createAdminClient();
  const { data: ad } = await db
    .from("anuncios")
    .select("id, marca_id, status, formato, com_texto, com_fecho, texto_oferta, versao_montagem, tentativas_montagem, montagem_iniciada_em, criado_por, produtos(nome), marcas(nome, instagram, logo_path, cta_padrao, cor_destaque)")
    .eq("id", anuncioId)
    .maybeSingle();
  if (!ad || ad.status !== "montando" || ad.tentativas_montagem >= 3) return;
  if (ad.montagem_iniciada_em && Date.now() - new Date(ad.montagem_iniciada_em).getTime() < MONTAGE_STALE_MS) return;
  let claim = db
    .from("anuncios")
    .update({ montagem_iniciada_em: new Date().toISOString(), tentativas_montagem: ad.tentativas_montagem + 1, erro: null })
    .eq("id", anuncioId)
    .eq("status", "montando")
    .eq("tentativas_montagem", ad.tentativas_montagem);
  claim = ad.montagem_iniciada_em ? claim.eq("montagem_iniciada_em", ad.montagem_iniciada_em) : claim.is("montagem_iniciada_em", null);
  const { data: claimed } = await claim.select("id");
  if (!claimed?.length) return;

  const work = mkdtempSync(join(tmpdir(), "adfit-ad-"));
  try {
    const marca = ad.marcas as unknown as { nome: string; instagram: string | null; logo_path: string | null; cta_padrao: string | null; cor_destaque: string | null };
    const { data: cenas } = await db.from("cenas").select("ordem, texto_tela, clipes!cenas_clipe_atual_id_fkey(video_path)").eq("anuncio_id", anuncioId).order("ordem");
    if (!cenas || cenas.length !== 3) throw new Error("cenas_incompletas");
    const clips = await Promise.all(
      cenas.map(async (c, i) => {
        const path = (c.clipes as unknown as { video_path: string | null } | null)?.video_path;
        if (!path) throw new Error(`cena_${i + 1}_sem_clipe`);
        const { bucket, object } = brandObject(ad.marca_id, path);
        const { data, error } = await db.storage.from(bucket).download(object);
        if (error || !data) throw error ?? new Error("download_clipe");
        const file = join(work, `c${i + 1}.mp4`);
        writeFileSync(file, Buffer.from(await data.arrayBuffer()));
        return file;
      }),
    );
    let logoPng: string | null = null;
    if (marca.logo_path && marca.logo_path.startsWith(`${ad.marca_id}/`)) {
      const { data } = await db.storage.from("marcas").download(marca.logo_path);
      if (data) {
        logoPng = join(work, "logo.png");
        await sharp(Buffer.from(await data.arrayBuffer()), { density: 300 }).png().toFile(logoPng);
      }
    }
    const out = join(work, "final.mp4");
    await assembleVideo({
      clips: clips as [string, string, string],
      out,
      formato: ad.formato,
      textos: ad.com_texto ? [cenas[0].texto_tela, cenas[1].texto_tela, null] : [null, null, null],
      fecho: ad.com_fecho !== false,
      logoPng,
      marca: marca.nome,
      cta: marca.cta_padrao,
      cor: marca.cor_destaque,
      oferta: ad.texto_oferta,
    });
    const versao = ad.versao_montagem + 1;
    const object = `${ad.marca_id}/${anuncioId}/video/v${versao}.mp4`;
    const { error: upErr } = await db.storage.from(AD_BUCKET).upload(object, readFileSync(out), { contentType: "video/mp4", upsert: true });
    if (upErr) throw upErr;
    if (await transition(anuncioId, "montando", "pronto", { video_final_path: `${AD_BUCKET}/${object}`, versao_montagem: versao, montagem_iniciada_em: null })) {
      await track({ nome: "adfit_video_pronto", distinctId: (await emailOf(ad.criado_por)) ?? "", tela: "Anúncio", descricao: versao === 1 ? "o vídeo do anúncio ficou pronto" : "o vídeo foi remontado com os ajustes", propriedades: { anuncio_id: anuncioId, versao_montagem: versao, formato: ad.formato } });
    }
  } catch (e) {
    console.error(`Montagem do anúncio ${anuncioId} falhou:`, e instanceof Error ? e.message : e);
    await db.from("anuncios").update({ erro: `montagem: ${e instanceof Error ? e.message : String(e)}`.slice(0, 500), montagem_iniciada_em: null }).eq("id", anuncioId).eq("status", "montando");
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
