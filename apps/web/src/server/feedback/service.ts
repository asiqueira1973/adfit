import "server-only";
import { z } from "zod";
import { createAdminClient, createUserClient } from "../db/supabase";
import type { Profile } from "../auth/profile";

/** Corpo do envio de feedback (emenda MD-6). */
export const feedbackSchema = z
  .object({
    tipo: z.enum(["problema", "sugestao"]),
    texto: z.string().trim().min(1).max(2000),
    tela: z.string().trim().max(300).regex(/^\/[^\s]*$/).optional(),
  })
  .strict();

/**
 * Envia um feedback em nome do usuário logado (MD-6). Grava com o cliente do usuário: a RLS
 * `feedbacks_insert` garante usuário, marca e status iniciais. Recebe: perfil e corpo. Devolve: nada.
 */
export async function sendFeedback(profile: Profile, body: z.infer<typeof feedbackSchema>): Promise<void> {
  const supabase = await createUserClient();
  const { error } = await supabase.from("feedbacks").insert({ usuario_id: profile.id, marca_id: profile.marcaId, tipo: body.tipo, texto: body.texto, tela: body.tela ?? null });
  if (error) throw error;
}

/**
 * Lista de feedbacks para o admin (MD-6), mais recentes primeiro, com nome do usuário e marca.
 * Lê com service_role (só chamado por telas/rotas que exigem admin). Recebe: filtro de status.
 */
export async function listFeedbacks(status?: "novo" | "visto" | "resolvido") {
  let q = createAdminClient()
    .from("feedbacks")
    .select("id, tipo, texto, tela, status, criado_em, perfis(nome, email), marcas(nome)")
    .order("criado_em", { ascending: false })
    .limit(200);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((f) => ({
    id: f.id,
    tipo: f.tipo,
    texto: f.texto,
    tela: f.tela,
    status: f.status,
    criadoEm: f.criado_em,
    usuario: (f.perfis as { nome: string; email: string } | null)?.nome ?? "—",
    email: (f.perfis as { nome: string; email: string } | null)?.email ?? "",
    marca: (f.marcas as { nome: string } | null)?.nome ?? null,
  }));
}

/** Muda o status de um feedback (admin, MD-6). Recebe: id e status. Devolve: nada. */
export async function setFeedbackStatus(id: string, status: "novo" | "visto" | "resolvido"): Promise<void> {
  const { data, error } = await createAdminClient().from("feedbacks").update({ status }).eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("feedback_inexistente");
}
