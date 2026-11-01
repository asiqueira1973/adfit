import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDictionary } from "@/lib/i18n";
import { getCurrentProfile } from "@/server/auth/profile";
import { errorResponse, jsonError } from "@/server/api/http";
import { convertHeicPhoto } from "@/server/products/heic";

export const maxDuration = 60;

/**
 * POST /api/fotos/:id/converter — converte para JPG uma foto HEIC já enviada ao Storage
 * (critério 8.3; divergência D-14). Quem: usuário da própria marca ou admin.
 * Recebe: nada no corpo. Devolve: { storage_path } (novo caminho .jpg) ou { erro, mensagem }.
 */
export async function POST(_request: NextRequest, { params }: RouteContext<"/api/fotos/[id]/converter">) {
  const profile = await getCurrentProfile();
  const t = getDictionary(profile?.idioma);
  if (!profile?.ativo) return jsonError("nao_autenticado", t.erros.naoAutenticado, 401);
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("validacao", t.erros.validacao, 400);
  try {
    return NextResponse.json({ storage_path: await convertHeicPhoto(id, profile) });
  } catch (e) {
    return errorResponse(e, profile.idioma);
  }
}
