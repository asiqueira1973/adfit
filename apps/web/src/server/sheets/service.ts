import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "../db/supabase";
import { BusinessError } from "../api/http";
import { readConfig } from "../config";
import { createClaudeAdjuster } from "../claude/client";
import type { PromptAdjuster } from "../claude/types";
import { failGeneration, generationDeps, getGeneration, submitGeneration, type GenerationDeps, type GenerationInput } from "../higgsfield/process";
import { buildFirstSheetPrompt, buildRedoSheetPrompt, redoBasePrompt, type SheetPrompt } from "./prompt";
import { appendShortcutLines, redoRequest, type RedoInput } from "../prompts/redo-shortcuts";
import { track } from "../analytics/track";

/** Quem pede a ação: usuário da marca (só a própria marca) ou admin (qualquer marca) — seção 13. */
export type SheetActor = { id: string; papel: "admin_plataforma" | "usuario_marca"; marcaId: string | null; email?: string };

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
    return redoBasePrompt((data?.entrada as GenerationInput | undefined) ?? null, categoria);
  }
  return redoBasePrompt(null, categoria);
}

/**
 * POST /api/produtos/:id/ficha (seção 13; critérios 8.4). Valida produto da marca, não arquivado,
 * com ≥1 foto e sem ficha `gerando`; cria a versão (o índice único barra cliques simultâneos);
 * debita `gerar_ficha` (sem versão anterior com imagem) ou `refazer_ficha` ANTES de submeter
 * (11.2.1); a geração nasce `na_fila` antes do Claude (função encerrada no meio → varredura de
 * órfãs estorna); na refação, traduz o pedido pelo Claude (Anexo C.3); monta o prompt (C.1 +
 * cláusula fixa) e submete à Higgsfield. Falha técnica depois do débito → ficha `falhou` e estorno.
 * Recebe: ator, produto e instrução opcional (≤ 200). Devolve: { fichaId }.
 */
export async function requestSheet(
  actor: SheetActor,
  produtoId: string,
  instrucao: RedoInput,
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
  // Atalhos (linhas fixas) + texto livre; na 1ª versão não há pedido.
  const redo = isRedo ? redoRequest("ficha", instrucao) : { pedido: "", linhas: [] as string[], registro: "" };
  const pedido = redo.pedido;
  const fichaId = randomUUID();

  // 1. Débito antes de tudo (11.2.1), já referenciando a versão que vai nascer. Sem saldo ou
  //    com a marca pausada, nada é criado (fichas_produto nunca é excluída — seção 7.4).
  const { data: cobrancaId, error: debitErr } = await db.rpc("debitar_creditos", {
    p_marca_id: produto.marca_id,
    p_acao: isRedo ? "refazer_ficha" : "gerar_ficha",
    p_quantidade_itens: 1,
    p_referencia_tipo: "ficha",
    p_referencia_id: fichaId,
    p_criado_por: actor.id,
  });
  if (debitErr) throw debitErr;
  const refund = async (obs: string) => {
    if (!cobrancaId) return;
    const { error } = await db.rpc("estornar_creditos", { p_movimentacao_id: cobrancaId, p_observacao: obs });
    if (error && error.message !== "ja_estornado") throw error;
  };

  // 2. A versão `gerando`; o índice único recusa o 2º clique simultâneo → estorno (plano 8.4).
  const { error: insErr } = await db
    .from("fichas_produto")
    .insert({ id: fichaId, produto_id: produto.id, marca_id: produto.marca_id, versao, status: "gerando", instrucao_refacao: redo.registro || null });
  if (insErr) {
    await refund("Pedido de ficha repetido: já havia uma ficha em preparo");
    throw insErr.code === "23505" ? new BusinessError("ficha_em_geracao") : insErr;
  }

  // 3. A geração nasce `na_fila` ANTES do Claude: se a função for encerrada no meio, a varredura
  //    de gerações órfãs (stale.ts) acha a ficha, marca `falhou` e estorna (regra 11.2.4).
  const { modelo_imagem } = await readConfig(["modelo_imagem"]);
  const { versao: promptVersao } = buildFirstSheetPrompt(produto.categoria);
  const entrada: GenerationInput = {
    prompt: "",
    prompt_base: "",
    prompt_versao: promptVersao,
    referencias: fotos.map((f) => f.storage_path),
    aspect_ratio: "16:9",
    resumo_refacao: null,
  };
  const { data: geracao, error: genErr } = await db
    .from("geracoes")
    .insert({ marca_id: produto.marca_id, tipo: "ficha_produto", modelo: String(modelo_imagem), entrada: entrada as never, cobranca_id: cobrancaId })
    .select("id")
    .single();
  if (genErr || !geracao) {
    await db.from("fichas_produto").update({ status: "falhou" }).eq("id", fichaId).eq("status", "gerando");
    await refund(`Falha técnica na ficha (versão ${versao})`);
    return { fichaId };
  }
  await db.from("fichas_produto").update({ geracao_id: geracao.id }).eq("id", fichaId);

  const generation = deps.generation ?? generationDeps();
  try {
    // 4. Prompt: C.1 na v1; na refação, o pedido traduzido pelo Claude (C.3) + cláusula fixa.
    let prompt: SheetPrompt;
    if (isRedo) {
      const adjuster = deps.adjuster ?? testAdjuster ?? createClaudeAdjuster();
      const adjusted = await adjuster.adjustPrompt({ tipo: "ficha", promptAtual: await currentBasePrompt(fichas, produto.categoria), pedido });
      prompt = buildRedoSheetPrompt(appendShortcutLines(adjusted.prompt, redo.linhas));
      entrada.resumo_refacao = adjusted.resumo_pt;
    } else {
      prompt = buildFirstSheetPrompt(produto.categoria);
    }
    Object.assign(entrada, { prompt: prompt.final, prompt_base: prompt.base, prompt_versao: prompt.versao });
    const { error } = await db.from("geracoes").update({ entrada: entrada as never }).eq("id", geracao.id);
    if (error) throw error;
  } catch (e) {
    // Sem prompt não há o que retentar: falha definitiva e estorno pela política comum.
    console.error("Ficha: falha técnica antes da submissão:", e instanceof Error ? e.message : e);
    const g = await getGeneration(geracao.id);
    if (g) await failGeneration(g, "falhou", `preparo: ${e instanceof Error ? e.message : String(e)}`, generation);
    return { fichaId };
  }

  // 5. Submissão (erro aqui segue a política de retentativa/estorno dentro de submitGeneration).
  await submitGeneration(geracao.id, generation);
  await track({ nome: "adfit_ficha_solicitada", distinctId: actor.email ?? "", tela: "Produto", descricao: isRedo ? "pediu para refazer a ficha da peça" : "pediu a primeira ficha da peça", propriedades: { produto_id: produto.id, refacao: isRedo, versao } });
  return { fichaId };
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
  await track({ nome: "adfit_ficha_aprovada", distinctId: actor.email ?? "", tela: "Produto", descricao: "aprovou a ficha da peça (produto pronto para anúncio)", propriedades: { produto_id: String(data), ficha_id: fichaId } });
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
