import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { publicServerEnv, serverEnv } from "../env";

export type Db = Database;

/**
 * Cliente Supabase com a sessão do usuário (cookies), sujeito à RLS da seção 6.4.
 * Usar em Server Components, Server Actions e Route Handlers.
 * Recebe: nada. Devolve: o cliente tipado.
 */
export async function createUserClient() {
  // Marca a leitura como de requisição: o cliente do Supabase usa o relógio (validade do token),
  // o que o Cache Components proíbe durante o prerender.
  await connection();
  const env = publicServerEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component não grava cookie; o proxy renova a sessão (src/proxy.ts).
        }
      },
    },
  });
}

/**
 * Cliente com a credencial privilegiada (service_role): ignora RLS e executa as funções de
 * crédito da seção 7.5. Só no servidor (seção 20); toda rota que o usa valida a permissão antes.
 * Recebe: nada. Devolve: o cliente tipado, sem sessão persistida.
 */
export function createAdminClient() {
  const env = serverEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
