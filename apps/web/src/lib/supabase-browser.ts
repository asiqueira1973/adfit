"use client";

import { createBrowserClient } from "@supabase/ssr";
import { PUBLIC_ENV } from "./public-env";
import type { Database } from "@/server/db/database.types";

/**
 * Cliente Supabase do navegador (chave pública + sessão em cookie), sujeito à RLS e às políticas
 * de Storage da seção 6.4. Usado só para upload direto ao Storage (logo e fotos originais).
 */
export function createBrowserSupabase() {
  return createBrowserClient<Database>(PUBLIC_ENV.supabaseUrl, PUBLIC_ENV.supabaseAnonKey);
}
