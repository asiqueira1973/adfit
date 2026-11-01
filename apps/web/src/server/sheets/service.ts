import "server-only";
import { createAdminClient } from "../db/supabase";
import { BusinessError } from "../api/http";
import { readConfig } from "../config";
import { createClaudeAdjuster } from "../claude/client";
import type { PromptAdjuster } from "../claude/types";
import { generationDeps, submitGeneration, type GenerationDeps, type GenerationInput } from "../higgsfield/process";
import { buildFirstSheetPrompt, buildRedoSheetPrompt, type SheetPrompt } from "./prompt";

/** Quem pede a ação: usuário da marca (só a própria marca) ou admin (qualquer marca) — seção 13. */
export type SheetActor = { id: string; papel: "admin_plataforma" | "usuario_marca"; marcaId: string | null };

let testAdjuster: PromptAdjuster | null = null;

/** Troca o cliente do Claude nos testes de integração (nunca usado fora de testes). */
export function setAdjusterForTests(adjuster: PromptAdjuster | null): void {
  testAdjuster = adjuster;
}

type SheetRow = { id: string; versao: number; status: string; imagem_path: string | null; geracao_id: string | null };

/** Confere que a marca do recurso é a do usuário (admin passa). Recebe: ator e marca. */
function assertOwner(actor: SheetActor, marcaId: string, notFound: string): void {
  if (actor.papel !== "admin_plataforma" && actor.marcaId !== marcaId) throw new BusinessError(notFound);
}

/** Prompt base da última versão com imagem (o "prompt atual" do Anexo C.3). */
async function currentBasePrompt(fichas: SheetRow[], categoria: string): Promise<string> {
  const last = [...fichas].filter((f) => f.imagem_path && f.geracao_id).sort((a, b) => b.versao - a.versao)[0];
  if (last?.geracao_id) {
    const { data } = await createAdminClient().from("geracoes").select("entrada").eq("id", last.geracao_id).maybeSingle();
    const base = (data?.entrada as GenerationInput | undefined)?.prompt_base;
    if (base) return base;
  }
  return buildFirstSheetPrompt(categoria).base;
}

/**
 * POST /api/produtos/:id/ficha (seção 13; critérios 8.4). Valida produto da marca, não arquivado,
 * com ≥1 foto e sem ficha `gerando`; cria a versão (o índice único barra cliques simultâneos);
 * debita `gerar_ficha` (sem versão anterior com imagem) ou `refazer_ficha` ANTES de submeter
 * (11.2.1); na refação, traduz o pedido pelo Claude (Anexo C.3); monta o prompt (C.1 + cláusula
 * fixa) e submete à Higgsfield. Falha técnica depois do débito → ficha `falhou` e estorno.
 * Recebe: ator, produto e instrução opcional (≤ 200). Devolve: { fichaId }.
 */
export async function requestSheet(
  actor: SheetActor,
  produtoId: string,
  instrucao: string | undefined,
  deps: { generation?: GenerationDeps; adjuster?: PromptAdjuster } = {},
): Promise<{ fichaId: string }> {
  const db = createAdminClient();
  const { data: produto } = await db
    .from("produtos")
    .select("id, marca_id, categoria, arquivado, fotos_produto(storage_path, ordem), fichas_produto!fichas_produto_produto_id_fkey(id, versao, status, imagem_path, geracao_id)")
    .eq("id", produtoId)
    .maybeSingle();
  if (!produto) throw new BusinessError("produto_inexistente");
  assertOwner(actor, produto.marca_id, "produto_inexistente");
  if (produto.arquivado) throw new BusinessError("produto_arquivado");
  const fotos = [...(produto.fotos_produto ?? [])].sort((a, b) => a.ordem - b.ordem);
  if (!fotos.length) throw new BusinessError("produto_sem_fotos");
  const fichas = (produto.fichas_produto ?? []) as SheetRow[];
  if (fichas.some((f) => f.status === "gerando")) throw new BusinessError("ficha_em_geracao");

  const isRedo = fichas.some((f) => f.imagem_path);
  const versao = Math.max(0, ...fichas.map((f) => f.versao)) + 1;
  const pedido = isRedo ? (instrucao ?? "").trim() : "";

  const { data: ficha, error: insErr } = await db
    .from("fichas_produto")
    .insert({ produto_id: produto.id, marca_id: produto.marca_id, versao, status: "gerando", instrucao_refacao: pedido || null })
    .select("id")
    .single();
  if (insErr) throw insErr.code === "23505" ? new BusinessError("ficha_em_geracao") : insErr;

  const { data: cobrancaId, error: debitErr } = await db.rpc("debitar_creditos", {
    p_marca_id: produto.marca_id,
    p_acao: isRedo ? "refazer_ficha" : "gerar_ficha",
    p_quantidade_itens: 1,
    p_referencia_tipo: "ficha",
    p_referencia_id: ficha.id,
    p_criado_por: actor.id,
  });
  if (debitErr) {
    // Nada foi cobrado: a versão some (saldo insuficiente, marca pausada…).
    await db.from("fichas_produto").delete().eq("id", ficha.id);
    throw debitErr;
  }

  try {
    let prompt: SheetPrompt;
    let resumo: string | null = null;
    if (isRedo) {
      const adjuster = deps.adjuster ?? testAdjuster ?? createClaudeAdjuster();
      const adjusted = await adjuster.adjustPrompt({ tipo: "ficha", promptAtual: await currentBasePrompt(fichas, produto.categoria), pedido });
      prompt = buildRedoSheetPrompt(adjusted.prompt);
      resumo = adjusted.resumo_pt;
    } else {
      prompt = buildFirstSheetPrompt(produto.categoria);
    }
    const { modelo_imagem } = await readConfig(["modelo_imagem"]);
    const entrada: GenerationInput = {
      prompt: prompt.final,
      prompt_base: prompt.base,
      prompt_versao: prompt.versao,
      referencias: fotos.map((f) => f.storage_path),
      aspect_ratio: "16:9",
      resumo_refacao: resumo,
    };
    const { data: geracao, error: genErr } = await db
      .from("geracoes")
      .insert({ marca_id: produto.marca_id, tipo: "ficha_produto", modelo: String(modelo_imagem), entrada: entrada as never, cobranca_id: cobrancaId })
      .select("id")
      .single();
    if (genErr) throw genErr;
    await db.from("fichas_produto").update({ geracao_id: geracao.id }).eq("id", ficha.id);
    await submitGeneration(geracao.id, deps.generation ?? generationDeps());
  } catch (e) {
    console.error("Ficha: falha técnica antes da submissão:", e instanceof Error ? e.message : e);
    const { data: failed } = await db.from("fichas_produto").update({ status: "falhou" }).eq("id", ficha.id).eq("status", "gerando").select("id");
    if (failed?.length && cobrancaId) {
      await db.rpc("estornar_creditos", { p_movimentacao_id: cobrancaId, p_observacao: `Falha técnica na ficha (versão ${versao})` });
    }
  }
  return { fichaId: ficha.id };
}

/**
 * POST /api/fichas/:id/aprovar (seção 13; critério 8.4): ficha da marca do usuário; delega a
 * `aprovar_ficha` (atômica: aprova, descarta as outras versões, define `ficha_aprovada_id`).
 * Voltar para versão anterior = aprovar uma `descartada` com imagem, sem custo.
 * Recebe: ator e ficha. Devolve: { produtoId }.
 */
export async function approveSheet(actor: SheetActor, fichaId: string): Promise<{ produtoId: string }> {
  const db = createAdminClient();
  const { data: ficha } = await db.from("fichas_produto").select("id, marca_id").eq("id", fichaId).maybeSingle();
  if (!ficha) throw new BusinessError("ficha_inexistente");
  assertOwner(actor, ficha.marca_id, "ficha_inexistente");
  const { data, error } = await db.rpc("aprovar_ficha", { p_ficha_id: fichaId });
  if (error) throw error;
  return { produtoId: data as string };
}

/**
 * Estado das versões da ficha de um produto (polling de 5 s da tela, D-15). Recebe: ator e produto.
 * Devolve: versões (sem prompt nem custo — seção 5) e os ids das gerações em andamento.
 */
export async function sheetStatus(actor: SheetActor, produtoId: string) {
  const db = createAdminClient();
  const { data: produto } = await db.from("produtos").select("id, marca_id, ficha_aprovada_id").eq("id", produtoId).maybeSingle();
  if (!produto) throw new BusinessError("produto_inexistente");
  assertOwner(actor, produto.marca_id, "produto_inexistente");
  const { data: fichas } = await db.from("fichas_produto").select("id, versao, status, geracao_id").eq("produto_id", produtoId).order("versao");
  return {
    fichaAprovadaId: produto.ficha_aprovada_id,
    versoes: (fichas ?? []).map((f) => ({ id: f.id, versao: f.versao, status: f.status })),
    geracoesEmAndamento: (fichas ?? []).filter((f) => f.status === "gerando" && f.geracao_id).map((f) => f.geracao_id as string),
  };
}
