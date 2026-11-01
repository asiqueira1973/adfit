import "server-only";
import { createUserClient } from "../db/supabase";

export type AdminBrandRow = { id: string; nome: string; instagram: string | null; saldo: number; anunciosMes: number; ativa: boolean };

/**
 * Lista de marcas do painel [Admin] Marcas (seção 10): nome, @, saldo, anúncios no mês e status.
 * Lê com a sessão do admin (RLS marcas_select/anuncios_select liberam tudo para eh_admin()).
 * Recebe: nada. Devolve: as marcas em ordem alfabética.
 */
export async function listBrandsForAdmin(): Promise<AdminBrandRow[]> {
  const supabase = await createUserClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [{ data: marcas, error }, { data: anuncios }] = await Promise.all([
    supabase.from("marcas").select("id, nome, instagram, saldo_creditos, ativa").order("nome"),
    supabase.from("anuncios").select("marca_id").gte("criado_em", monthStart.toISOString()),
  ]);
  if (error) throw error;
  const perBrand = new Map<string, number>();
  for (const a of anuncios ?? []) perBrand.set(a.marca_id, (perBrand.get(a.marca_id) ?? 0) + 1);
  return (marcas ?? []).map((m) => ({ id: m.id, nome: m.nome, instagram: m.instagram, saldo: m.saldo_creditos, anunciosMes: perBrand.get(m.id) ?? 0, ativa: m.ativa }));
}
