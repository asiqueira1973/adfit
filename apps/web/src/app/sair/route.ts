import { NextResponse, type NextRequest } from "next/server";
import { createUserClient } from "@/server/db/supabase";

/**
 * POST /sair — logout pelo menu do perfil (seção 6.3). Encerra a sessão e volta para /entrar.
 * É POST (formulário) e não GET para que o prefetch de links nunca deslogue ninguém.
 */
export async function POST(request: NextRequest) {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/entrar", request.url), { status: 303 });
}
