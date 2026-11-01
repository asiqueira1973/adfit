import "server-only";
import type { NextResponse } from "next/server";
import { getDictionary } from "@/lib/i18n";
import { getCurrentProfile, type Profile } from "../auth/profile";
import { jsonError } from "./http";

/**
 * Guarda das rotas de admin (seção 13: "toda rota de admin confere eh_admin() no servidor").
 * Recebe: nada (sessão). Devolve: o perfil do admin, ou a resposta 401/403 para devolver direto.
 * Mesma regra de eh_admin(): papel admin_plataforma e ativo.
 */
export async function requireAdminApi(): Promise<Profile | NextResponse> {
  const profile = await getCurrentProfile();
  const t = getDictionary(profile?.idioma);
  if (!profile) return jsonError("nao_autenticado", t.erros.naoAutenticado, 401);
  if (!profile.ativo || profile.papel !== "admin_plataforma") return jsonError("nao_autorizado", t.erros.naoAutorizado, 403);
  return profile;
}

/**
 * Guarda das rotas da marca (matriz da seção 5): exige `usuario_marca` ativo com marca.
 * Admin recebe 403 — na compra de créditos, "admin não compra; lança manualmente" (seção 5).
 * Recebe: nada. Devolve: o perfil com marcaId, ou a resposta 401/403.
 */
export async function requireBrandApi(): Promise<(Profile & { marcaId: string }) | NextResponse> {
  const profile = await getCurrentProfile();
  const t = getDictionary(profile?.idioma);
  if (!profile) return jsonError("nao_autenticado", t.erros.naoAutenticado, 401);
  if (!profile.ativo || profile.papel !== "usuario_marca" || !profile.marcaId) return jsonError("nao_autorizado", t.erros.naoAutorizado, 403);
  return profile as Profile & { marcaId: string };
}

/** Diz se o valor devolvido pela guarda é uma resposta de erro (e não o perfil). */
export function isResponse<P extends Profile>(value: P | NextResponse): value is NextResponse {
  return value instanceof Response;
}
