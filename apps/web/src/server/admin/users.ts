import "server-only";
import { createAdminClient, createUserClient } from "../db/supabase";
import { BusinessError } from "../api/http";
import { publicServerEnv } from "../env";
import type { InviteUserInput } from "./schemas";
import { mailer } from "../mail/mailer";
import type { Locale } from "@/lib/i18n";

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

/** Acha o usuário do Auth compartilhado pelo e-mail (pode ser de outro app do projeto). */
async function findAuthUserId(email: string): Promise<string | null> {
  const admin = createAdminClient();
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

/**
 * Convida um usuário de marca (POST /api/admin/usuarios; seções 6.1 e 8.2; emenda MD-7: login só
 * com Google). Recebe: e-mail, nome, marca e o idioma do e-mail. Faz: recusa e-mail que já tem perfil
 * no AdFit (`email_existente`); cria o usuário no Auth sem senha e com e-mail confirmado — ou
 * reaproveita o que já existe no Auth compartilhado (outro app) —; cria `perfis` (usuario_marca);
 * manda o e-mail de boas-vindas com o link de entrar. Se o perfil falhar, remove o usuário recém-criado.
 * Devolve: { id, emailEnviado, link } — sem e-mail, o admin manda o link por conta própria.
 */
export async function inviteUser(input: InviteUserInput, idioma: Locale): Promise<{ id: string; emailEnviado: boolean; link: string }> {
  const admin = createAdminClient();
  const { data: marca } = await admin.from("marcas").select("id, nome").eq("id", input.marca_id).maybeSingle();
  if (!marca) throw new BusinessError("marca_inexistente");
  const { data: existing } = await admin.from("perfis").select("id").ilike("email", input.email).maybeSingle();
  if (existing) throw new BusinessError("email_existente");

  let userId = await findAuthUserId(input.email);
  const createdNow = !userId;
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({ email: input.email, email_confirm: true, user_metadata: { nome: input.nome } });
    if (error) throw error;
    userId = data.user.id;
  }
  const { data: perfilExistente } = await admin.from("perfis").select("id").eq("id", userId).maybeSingle();
  if (perfilExistente) throw new BusinessError("email_existente");
  const { error: perfilError } = await admin.from("perfis").insert({ id: userId, email: input.email, nome: input.nome, marca_id: input.marca_id, papel: "usuario_marca", idioma });
  if (perfilError) {
    if (createdNow) await admin.auth.admin.deleteUser(userId);
    throw perfilError;
  }
  const link = `${publicServerEnv().APP_URL}/entrar`;
  const emailEnviado = await mailer().sendWelcome({ to: input.email, nome: input.nome, marca: marca.nome, idioma, link });
  return { id: userId, emailEnviado, link };
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
