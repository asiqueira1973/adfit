/**
 * Variáveis públicas (vão para o navegador). Nada secreto aqui (seção 20).
 * Lidas de forma literal para o Next embutir no bundle do cliente.
 */
export const PUBLIC_ENV = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};
