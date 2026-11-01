import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createUserClient } from "@/server/db/supabase";

const TYPES: EmailOtpType[] = ["invite", "recovery", "email", "magiclink", "signup", "email_change"];

/**
 * GET /auth/confirm — destino dos links de convite e de recuperação (seções 6.1 e 6.2).
 * Recebe: `token_hash`, `type` e `next` (caminho interno) — ou `code` (fluxo PKCE).
 * Faz: valida o token no Supabase, criando a sessão em cookie. Devolve: redirect para `next`
 * (só caminhos internos) ou para /entrar?erro=link_invalido.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = url.searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const supabase = await createUserClient();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type && TYPES.includes(type)) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }
  return NextResponse.redirect(new URL(ok ? safeNext : "/entrar?erro=link_invalido", request.url));
}
