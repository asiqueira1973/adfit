/**
 * Variáveis públicas (vão para o navegador). Nada secreto aqui (seção 20).
 * Lidas de forma literal para o Next embutir no bundle do cliente.
 */
export const PUBLIC_ENV = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  // ID do cliente OAuth do Google (MD-5/MD-7). Não é segredo: o Google o mostra no próprio botão.
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
};
