import "server-only";
import { createAdminClient, createUserClient } from "../db/supabase";
import { objectPath, PHOTO_BUCKET } from "@/lib/storage-paths";

export type ProductStatus = "sem_ficha" | "gerando" | "pronto";

/** URLs assinadas de 60 min (seção 6.4) para vários caminhos de um bucket. */
async function signMany(bucket: string, paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await createAdminClient().storage.from(bucket).createSignedUrls(paths.map((p) => objectPath(p, bucket)), 3600);
  const out: Record<string, string> = {};
  (data ?? []).forEach((d, i) => d.signedUrl && (out[paths[i]] = d.signedUrl));
  return out;
}

/**
 * Lista de produtos da marca (tela [Marca] Produtos; critério 8.3: selo "Sem ficha"): não arquivados,
 * mais recentes primeiro, com miniatura (ficha aprovada ou 1ª foto) e estado da ficha.
 * Lê com a sessão do usuário (RLS produtos_select/fotos_select/fichas_select).
 * Recebe: marca e categoria opcional. Devolve: os produtos.
 */
export async function listProducts(marcaId: string, categoria?: string) {
  const supabase = await createUserClient();
  let q = supabase
    .from("produtos")
    .select("id, nome, categoria, genero_alvo, ficha_aprovada_id, criado_em, fotos_produto(storage_path, ordem), fichas_produto!fichas_produto_produto_id_fkey(id, status, imagem_path)")
    .eq("marca_id", marcaId)
    .eq("arquivado", false)
    .order("criado_em", { ascending: false });
  if (categoria) q = q.eq("categoria", categoria as never);
  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []).map((p) => {
    const fichas = (p.fichas_produto ?? []) as Array<{ id: string; status: string; imagem_path: string | null }>;
    const aprovada = fichas.find((f) => f.id === p.ficha_aprovada_id);
    const fotos = [...((p.fotos_produto ?? []) as Array<{ storage_path: string; ordem: number }>)].sort((a, b) => a.ordem - b.ordem);
    const status: ProductStatus = p.ficha_aprovada_id ? "pronto" : fichas.some((f) => f.status === "gerando") ? "gerando" : "sem_ficha";
    return { id: p.id, nome: p.nome, categoria: p.categoria, status, fichaPath: aprovada?.imagem_path ?? null, fotoPath: fotos[0]?.storage_path ?? null };
  });
  const [fichaUrls, fotoUrls] = await Promise.all([
    signMany(PHOTO_BUCKET, rows.flatMap((r) => (r.fichaPath ? [r.fichaPath] : []))),
    signMany(PHOTO_BUCKET, rows.flatMap((r) => (r.fotoPath ? [r.fotoPath] : []))),
  ]);
  return rows.map((r) => ({ ...r, imagem: (r.fichaPath && fichaUrls[r.fichaPath]) || (r.fotoPath && fotoUrls[r.fotoPath]) || null }));
}

/**
 * Um produto com fotos (URL assinada) para a tela [Marca] Produto (seção 10).
 * Recebe: id. Devolve: o produto ou null (inexistente, arquivado ou de outra marca — RLS).
 */
export async function getProduct(id: string) {
  const supabase = await createUserClient();
  const { data } = await supabase
    .from("produtos")
    .select("id, marca_id, nome, categoria, genero_alvo, descricao, ficha_aprovada_id, arquivado, fotos_produto(id, storage_path, ordem), fichas_produto!fichas_produto_produto_id_fkey(id, versao, status, imagem_path)")
    .eq("id", id)
    .maybeSingle();
  if (!data || data.arquivado) return null;
  const fotos = [...((data.fotos_produto ?? []) as Array<{ id: string; storage_path: string; ordem: number }>)].sort((a, b) => a.ordem - b.ordem);
  const urls = await signMany(PHOTO_BUCKET, fotos.map((f) => f.storage_path));
  return { ...data, fotos: fotos.map((f) => ({ ...f, url: urls[f.storage_path] ?? null })) };
}
