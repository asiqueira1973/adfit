/**
 * Chamada às rotas JSON da seção 13 a partir do navegador.
 * Recebe: método, URL e corpo. Devolve: { ok: true, data } ou { ok: false, erro, mensagem }.
 */
export async function callApi<T = unknown>(
  method: "POST" | "PATCH",
  url: string,
  body: unknown,
): Promise<{ ok: true; data: T } | { ok: false; erro: string; mensagem: string }> {
  try {
    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, data: json as T };
    return { ok: false, erro: json.erro ?? "erro_interno", mensagem: json.mensagem ?? "" };
  } catch {
    return { ok: false, erro: "rede", mensagem: "" };
  }
}
