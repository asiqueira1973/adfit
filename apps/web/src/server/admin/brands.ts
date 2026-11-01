import "server-only";
import { createAdminClient, createUserClient } from "../db/supabase";
import type { Database } from "../db/database.types";
import { BusinessError } from "../api/http";
import type { BrandKitInput, UpdateBrandInput } from "./schemas";

export type AdminBrandRow = { id: string; nome: string; instagram: string | null; saldo: number; anunciosMes: number; ativa: boolean };

/** Início do mês corrente em UTC (ISO). */
function monthStartIso(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Lista de marcas do painel [Admin] Marcas (seção 10): nome, @, saldo, anúncios no mês e status.
 * Lê com a sessão do admin (RLS: eh_admin() vê tudo). Recebe: nada. Devolve: marcas por nome.
 */
export async function listBrandsForAdmin(): Promise<AdminBrandRow[]> {
  const supabase = await createUserClient();
  const [{ data: marcas, error }, { data: anuncios }] = await Promise.all([
    supabase.from("marcas").select("id, nome, instagram, saldo_creditos, ativa").order("nome"),
    supabase.from("anuncios").select("marca_id").gte("criado_em", monthStartIso()),
  ]);
  if (error) throw error;
  const perBrand = new Map<string, number>();
  for (const a of anuncios ?? []) perBrand.set(a.marca_id, (perBrand.get(a.marca_id) ?? 0) + 1);
  return (marcas ?? []).map((m) => ({ id: m.id, nome: m.nome, instagram: m.instagram, saldo: m.saldo_creditos, anunciosMes: perBrand.get(m.id) ?? 0, ativa: m.ativa }));
}

/**
 * Kit completo de uma marca para o admin (tela [Admin] Marca, aba Kit).
 * Recebe: id. Devolve: a marca ou null.
 */
export async function getBrandForAdmin(id: string) {
  const supabase = await createUserClient();
  const { data } = await supabase
    .from("marcas")
    .select("id, nome, instagram, logo_path, cor_destaque, cta_padrao, tom_de_voz, idioma_anuncios, saldo_creditos, ativa")
    .eq("id", id)
    .maybeSingle();
  return data;
}

/**
 * Cria uma marca (POST /api/admin/marcas, critério 8.2 "Criar marca com nome e @").
 * Recebe: kit validado. Devolve: id da marca criada (saldo 0; só as funções da 7.5 mudam o saldo).
 */
export async function createBrand(input: BrandKitInput): Promise<string> {
  const { data, error } = await createAdminClient()
    .from("marcas")
    .insert({
      nome: input.nome,
      instagram: input.instagram ?? null,
      cor_destaque: input.cor_destaque ?? null,
      cta_padrao: input.cta_padrao ?? undefined,
      tom_de_voz: input.tom_de_voz ?? null,
      idioma_anuncios: input.idioma_anuncios ?? undefined,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/**
 * Edita o kit e/ou pausa/reativa a marca (PATCH /api/admin/marcas/:id; critério 8.2 e seção 6.3).
 * Admin edita tudo exceto o saldo (6.4). Recebe: id e campos. Devolve: nada; `marca_inexistente` se não achar.
 */
export async function updateBrand(id: string, input: UpdateBrandInput): Promise<void> {
  // saldo_creditos nunca entra no patch (só as funções da seção 7.5 mudam o saldo).
  const patch: Database["public"]["Tables"]["marcas"]["Update"] = {
    nome: input.nome,
    instagram: input.instagram,
    cor_destaque: input.cor_destaque,
    cta_padrao: input.cta_padrao,
    tom_de_voz: input.tom_de_voz,
    idioma_anuncios: input.idioma_anuncios,
    ativa: input.ativa,
  };
  const { data, error } = await createAdminClient().from("marcas").update(patch).eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new BusinessError("marca_inexistente");
}

/**
 * Anúncios de uma marca para a aba Anúncios do admin. Recebe: id da marca. Devolve: lista recente.
 */
export async function listBrandAds(marcaId: string) {
  const supabase = await createUserClient();
  const { data } = await supabase.from("anuncios").select("id, titulo, status, criado_em").eq("marca_id", marcaId).order("criado_em", { ascending: false }).limit(100);
  return data ?? [];
}
