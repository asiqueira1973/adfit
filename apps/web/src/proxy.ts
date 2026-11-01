import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/server/db/database.types";
import { LOCALE_COOKIE, isLocale, localeFromAcceptLanguage } from "@/lib/i18n";

/** Rotas públicas (seção 10): acessíveis sem sessão. */
const PUBLIC_PATHS = ["/entrar", "/definir-senha", "/redefinir-senha", "/acesso-desativado", "/auth/confirm", "/sair"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Proxy de toda requisição de página (seções 6.1–6.3 e emenda MD-1).
 * Recebe: a requisição. Faz: renova a sessão do Supabase (cookies), exige login fora das rotas
 *   públicas, desloga quem não tem perfil (usuário de outro app no Auth compartilhado) ou está
 *   desativado (vai para /acesso-desativado), separa admin (/admin) de marca e grava o idioma
 *   da sessão no cookie `adfit_idioma` (perfis.idioma ou, sem login, o do navegador).
 * Devolve: a resposta seguinte, um redirect, ou JSON 401 nas rotas /api sem sessão.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { pathname } = request.nextUrl;
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  /** Redireciona preservando os cookies de sessão renovados. */
  const redirectTo = (path: string) => {
    const res = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!user) {
    if (!isLocale(request.cookies.get(LOCALE_COOKIE)?.value)) {
      response.cookies.set(LOCALE_COOKIE, localeFromAcceptLanguage(request.headers.get("accept-language")), { path: "/", sameSite: "lax" });
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ erro: "nao_autenticado", mensagem: "Entre de novo para continuar." }, { status: 401 });
    }
    return isPublic(pathname) ? response : redirectTo("/entrar");
  }

  const { data: perfil } = await supabase.from("perfis").select("papel, ativo, idioma").eq("id", user.id).maybeSingle();

  if (!perfil || !perfil.ativo) {
    await supabase.auth.signOut();
    const target = perfil ? "/acesso-desativado" : "/entrar?erro=sem_acesso";
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ erro: "acesso_desativado", mensagem: "Seu acesso foi desativado. Fale com o suporte." }, { status: 403 });
    }
    return pathname === target.split("?")[0] ? response : redirectTo(target);
  }

  response.cookies.set(LOCALE_COOKIE, perfil.idioma, { path: "/", sameSite: "lax" });
  if (pathname.startsWith("/api/")) return response;

  const home = perfil.papel === "admin_plataforma" ? "/admin/marcas" : "/inicio";
  if (pathname === "/" || pathname === "/entrar") return redirectTo(home);
  if (perfil.papel === "admin_plataforma" && !pathname.startsWith("/admin") && !isPublic(pathname)) return redirectTo(home);
  if (perfil.papel === "usuario_marca" && pathname.startsWith("/admin")) return redirectTo(home);
  return response;
}

export const config = {
  matcher: [
    // Tudo, exceto estáticos, imagens e webhooks (que validam token/assinatura próprios, seção 13).
    "/((?!_next/static|_next/image|favicon.ico|images/|fixtures/|api/webhooks/).*)",
  ],
};
