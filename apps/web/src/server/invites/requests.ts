import "server-only";
import { z } from "zod";
import { createAdminClient } from "../db/supabase";
import { track } from "../analytics/track";
import type { Locale } from "@/lib/i18n";

/** Corpo do pedido de convite (MD-9). `site` é armadilha para robôs: tem de vir vazio. */
export const inviteRequestSchema = z
  .object({
    nome: z.string().trim().min(1).max(80),
    email: z.string().trim().toLowerCase().email().max(254),
    marca: z.string().trim().min(1).max(80),
    instagram: z
      .string()
      .trim()
      .transform((v) => v.replace(/^@/, ""))
      .pipe(z.string().regex(/^[A-Za-z0-9._]{0,30}$/))
      .optional(),
    mensagem: z.string().trim().max(500).optional(),
    site: z.string().max(0).optional(),
  })
  .strict();

/**
 * Registra um pedido de convite (MD-9) pelo servidor (o cliente não escreve na tabela). Pedido em
 * aberto do mesmo e-mail não duplica: devolve ok sem gravar de novo (não revela quem já pediu).
 * Recebe: corpo e idioma. Devolve: nada.
 */
export async function createInviteRequest(body: z.infer<typeof inviteRequestSchema>, idioma: Locale): Promise<void> {
  if (body.site) return;
  const { error } = await createAdminClient()
    .from("pedidos_convite")
    .insert({ nome: body.nome, email: body.email, marca: body.marca, instagram: body.instagram || null, mensagem: body.mensagem || null, idioma });
  if (error && error.code !== "23505") throw error;
  if (!error) await track({ nome: "adfit_convite_pedido", distinctId: body.email, tela: "Pedir convite", descricao: "pediu um convite para usar o AdFit", propriedades: { tem_instagram: !!body.instagram } });
}

/** Lista de pedidos para o admin (MD-9), mais recentes primeiro. Recebe: filtro de status. */
export async function listInviteRequests(status?: "novo" | "convidado" | "recusado") {
  let q = createAdminClient().from("pedidos_convite").select("id, nome, email, marca, instagram, mensagem, idioma, status, criado_em").order("criado_em", { ascending: false }).limit(200);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Muda o status de um pedido (admin, MD-9). */
export async function setInviteRequestStatus(id: string, status: "novo" | "convidado" | "recusado"): Promise<void> {
  const { data, error } = await createAdminClient().from("pedidos_convite").update({ status }).eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("pedido_inexistente");
}
