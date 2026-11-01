import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/server/auth/profile";
import { CLIENT_EVENTS, track } from "@/server/analytics/track";

const DESCRICOES: Record<(typeof CLIENT_EVENTS)[number], string> = {
  adfit_login: "entrou no AdFit com o Google",
  adfit_produto_criado: "cadastrou um produto com fotos",
};

/**
 * POST /api/eventos — eventos de produto que acontecem no navegador (emenda MD-8). Só nomes da lista
 * fechada `CLIENT_EVENTS`; quem fez vem da sessão (nunca do corpo). A chave do Visão de Produto fica
 * no servidor. Corpo: { nome, tela, propriedades? }. Devolve: 202 (ou 401 sem sessão).
 */
export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile?.ativo) return NextResponse.json({ erro: "nao_autenticado" }, { status: 401 });
  const parsed = z
    .object({
      nome: z.enum(CLIENT_EVENTS),
      tela: z.string().max(60),
      propriedades: z.record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean(), z.null()])).optional(),
    })
    .strict()
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erro: "validacao" }, { status: 400 });
  await track({ nome: parsed.data.nome, distinctId: profile.email, tela: parsed.data.tela, descricao: DESCRICOES[parsed.data.nome], propriedades: { papel: profile.papel, ...(parsed.data.propriedades ?? {}) } });
  return NextResponse.json({ ok: true }, { status: 202 });
}
