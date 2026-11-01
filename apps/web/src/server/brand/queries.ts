import "server-only";
import { cache } from "react";
import { createAdminClient, createUserClient } from "../db/supabase";

/**
 * Dados da marca do usuário para a casca da marca (seções 6.3 e 8.8): nome, saldo, se está ativa.
 * Lê com a sessão do usuário (RLS marcas_select). Recebe: id da marca. Devolve: a marca ou null.
 */
export const getBrandSummary = cache(async (marcaId: string) => {
  const supabase = await createUserClient();
  const { data } = await supabase.from("marcas").select("id, nome, saldo_creditos, ativa, logo_path, instagram").eq("id", marcaId).maybeSingle();
  return data;
});

/**
 * Contato de suporte da regra 11.6 (`configuracoes.contato_suporte`), exibido em "Conta pausada".
 * `configuracoes` é só do admin na RLS; o servidor lê com service_role só esta chave.
 * Recebe: nada. Devolve: o texto do contato.
 */
export const getSupportContact = cache(async (): Promise<string> => {
  const { data } = await createAdminClient().from("configuracoes").select("valor").eq("chave", "contato_suporte").maybeSingle();
  return typeof data?.valor === "string" ? data.valor : "";
});
