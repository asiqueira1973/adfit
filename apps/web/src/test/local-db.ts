/**
 * Proteção dos testes de integração: só rodam contra o Supabase local (portas 553xx), nunca no
 * projeto remoto compartilhado. Recebe: nada. Lança erro se NEXT_PUBLIC_SUPABASE_URL não for local.
 */
export function assertLocalSupabase(): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url)) {
    throw new Error(`Testes de integração só rodam no Supabase local (NEXT_PUBLIC_SUPABASE_URL=${url || "vazio"}).`);
  }
}
