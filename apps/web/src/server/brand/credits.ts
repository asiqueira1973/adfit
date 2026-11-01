import "server-only";
import { createUserClient } from "../db/supabase";
import { ledgerItem, type LedgerMaps } from "@/lib/ledger-items";

/**
 * Extrato de créditos da própria marca (tela [Marca] Créditos; critério 8.8: data, ação, item com
 * link, quantidade e saldo após; 8.9: compras com valor e moeda). Lê com a sessão do usuário (RLS) e
 * resolve o item de cada linha (ficha → produto; imagem, cena e anúncio → anúncio), só colunas
 * liberadas ao cliente (D-10). Recebe: id da marca. Devolve: movimentações (mais recentes primeiro).
 */
export async function listBrandLedger(marcaId: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("movimentacoes_creditos")
    .select("id, criado_em, tipo, acao, quantidade, saldo_apos, valor_pago_centavos, moeda, observacao, referencia_tipo, referencia_id")
    .eq("marca_id", marcaId)
    .order("criado_em", { ascending: false })
    .limit(200);
  if (error) throw error;
  const rows = data ?? [];
  const ids = (tipo: string) => [...new Set(rows.filter((r) => r.referencia_tipo === tipo && r.referencia_id).map((r) => r.referencia_id!))];
  const [fichas, quadros, clipes] = await Promise.all([
    ids("ficha").length ? supabase.from("fichas_produto").select("id, produto_id").in("id", ids("ficha")) : Promise.resolve({ data: [] }),
    ids("quadro").length ? supabase.from("quadros").select("id, cenas!quadros_cena_id_fkey(anuncio_id)").in("id", ids("quadro")) : Promise.resolve({ data: [] }),
    ids("clipe").length ? supabase.from("clipes").select("id, cenas!clipes_cena_id_fkey(anuncio_id)").in("id", ids("clipe")) : Promise.resolve({ data: [] }),
  ]);
  const maps: LedgerMaps = { fichas: {}, quadros: {}, clipes: {}, produtos: {}, anuncios: {} };
  for (const f of (fichas.data ?? []) as Array<{ id: string; produto_id: string }>) maps.fichas[f.id] = f.produto_id;
  for (const q of (quadros.data ?? []) as Array<{ id: string; cenas: { anuncio_id: string } | null }>) if (q.cenas) maps.quadros[q.id] = q.cenas.anuncio_id;
  for (const k of (clipes.data ?? []) as Array<{ id: string; cenas: { anuncio_id: string } | null }>) if (k.cenas) maps.clipes[k.id] = k.cenas.anuncio_id;
  const adIds = [...new Set([...ids("anuncio"), ...Object.values(maps.quadros), ...Object.values(maps.clipes)])];
  const prodIds = [...new Set(Object.values(maps.fichas))];
  const [ads, prods] = await Promise.all([
    adIds.length ? supabase.from("anuncios").select("id, titulo").eq("arquivado", false).in("id", adIds) : Promise.resolve({ data: [] }),
    prodIds.length ? supabase.from("produtos").select("id, nome").in("id", prodIds) : Promise.resolve({ data: [] }),
  ]);
  for (const a of (ads.data ?? []) as Array<{ id: string; titulo: string }>) maps.anuncios[a.id] = a.titulo;
  for (const p of (prods.data ?? []) as Array<{ id: string; nome: string }>) maps.produtos[p.id] = p.nome;
  return rows.map((r) => ({ ...r, item: ledgerItem(r, maps) }));
}

/** Preço em créditos de cada ação (regra 11.1), para a tabela "Quanto custa cada ação". */
export async function listActionPrices() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.from("precos_acoes").select("acao, creditos, descricao");
  if (error) throw error;
  const order = ["gerar_ficha", "refazer_ficha", "gerar_roteiro_quadros", "refazer_quadro", "gerar_video", "refazer_clipe", "remontar_texto"];
  return (data ?? []).sort((a, b) => order.indexOf(a.acao) - order.indexOf(b.acao));
}

/** Histórico de pagamentos da própria marca (tela Créditos). */
export async function listBrandPayments(marcaId: string) {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("pagamentos")
    .select("id, criado_em, creditos, valor_centavos, moeda, status, pacotes_creditos(nome)")
    .eq("marca_id", marcaId)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p) => ({ ...p, pacote: (p.pacotes_creditos as { nome: string } | null)?.nome ?? "" }));
}

/**
 * Pacotes à venda (critério 8.9): só `ativo = true` (a RLS pacotes_select já filtra para a marca),
 * na ordem de `ordem`. Recebe: nada. Devolve: os pacotes.
 */
export async function listActivePackages() {
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("pacotes_creditos")
    .select("id, nome, creditos, preco_centavos, moeda, ordem")
    .eq("ativo", true)
    .order("ordem")
    .order("creditos");
  if (error) throw error;
  return data ?? [];
}
