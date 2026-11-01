/**
 * Envia um evento de produto do navegador para `POST /api/eventos` (MD-8). Nunca bloqueia nem
 * mostra erro: analytics não pode atrapalhar o uso. Recebe: nome (lista fechada no servidor), tela
 * e propriedades. Devolve: nada.
 */
export function trackClient(nome: "adfit_login" | "adfit_produto_criado", tela: string, propriedades?: Record<string, string | number | boolean | null>): void {
  try {
    void fetch("/api/eventos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nome, tela, propriedades }), keepalive: true }).catch(() => undefined);
  } catch {
    // Sem analytics, segue a vida.
  }
}
