import "server-only";
import { createAdminClient, createUserClient } from "../db/supabase";
import { BusinessError } from "../api/http";
import { publicServerEnv } from "../env";
import type { InviteUserInput } from "./schemas";

export type AdminUserRow = { id: string; nome: string; email: string; marcaId: string | null; marcaNome: string | null; papel: string; ativo: boolean };

/**
 * Usuários para [Admin] Usuários e aba Usuários da marca (seção 10).
 * Recebe: id da marca opcional (filtra). Devolve: perfis com o nome da marca.
 */
export async function listUsers(marcaId?: string): Promise<AdminUserRow[]> {
  const supabase = await createUserClient();
  let query = supabase.from("perfis").select("id, nome, email, papel, ativo, marca_id, marcas(nome)").order("nome");
  if (marcaId) query = query.eq("marca_id", marcaId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    email: p.email,
    marcaId: p.marca_id,
    marcaNome: (p.marcas as { nome: string } | null)?.nome ?? null,
    papel: p.papel,
    ativo: p.ativo,
  }));
}

/**
 * Convida um usuário de marca (POST /api/admin/usuarios; seções 6.1 e 8.2).
 * Recebe: e-mail, nome e marca. Faz: recusa e-mail já cadastrado (`email_existente`) — inclusive no
 *   Auth compartilhado —, chama `auth.admin.inviteUserByEmail` com retorno em /auth/confirm →
 *   /definir-senha e cria `perfis` com papel usuario_marca e a marca informada. Se o perfil falhar,
 *   remove o usuário recém-criado no Auth para não deixar convite órfão.
 * Devolve: id do usuário.
 */
export async function inviteUser(input: InviteUserInput): Promise<string> {
  const admin = createAdminClient();
  const { data: marca } = await admin.from("marcas").select("id").eq("id", input.marca_id).maybeSingle();
  if (!marca) throw new BusinessError("marca_inexistente");
  const { data: existing } = await admin.from("perfis").select("id").eq("email", input.email).maybeSingle();
  if (existing) throw new BusinessError("email_existente");

  const redirectTo = `${publicServerEnv().APP_URL}/auth/confirm?next=${encodeURIComponent("/definir-senha")}`;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, { redirectTo, data: { nome: input.nome } });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) throw new BusinessError("email_existente");
    throw error;
  }
  const userId = data.user.id;
  const { error: perfilError } = await admin.from("perfis").insert({ id: userId, email: input.email, nome: input.nome, marca_id: input.marca_id, papel: "usuario_marca" });
  if (perfilError) {
    await admin.auth.admin.deleteUser(userId);
    throw perfilError;
  }
  return userId;
}

/**
 * Ativa/desativa um usuário (PATCH /api/admin/usuarios/:id; seção 6.3). O proxy desloga o usuário
 * desativado no próximo request. O admin não desativa a si mesmo.
 * Recebe: id do usuário alvo, novo valor e id do admin. Devolve: nada.
 */
export async function setUserActive(userId: string, ativo: boolean, actorId: string): Promise<void> {
  if (userId === actorId && !ativo) throw new BusinessError("nao_autorizado");
  const { data, error } = await createAdminClient().from("perfis").update({ ativo }).eq("id", userId).select("id");
  if (error) throw error;
  if (!data?.length) throw new BusinessError("usuario_inexistente");
}
