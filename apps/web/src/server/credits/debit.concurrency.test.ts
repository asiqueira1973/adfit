import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";

/**
 * Seção 22 (banco): "concorrência — dois débitos simultâneos não deixam saldo negativo".
 * Usa duas conexões reais no Supabase local (npm test sobe o banco antes, scripts/test-db.mjs).
 * A marca de teste recebe o preço de `gerar_video` em créditos e duas transações tentam debitá-lo ao
 * mesmo tempo: o `for update` de debitar_creditos serializa; uma passa e a outra recebe
 * `saldo_insuficiente`.
 */
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:55322/postgres";
// Este teste grava (o livro-razão é imutável): só roda contra o Supabase local, nunca no remoto compartilhado.
const host = new URL(DATABASE_URL).hostname;
if (!["127.0.0.1", "localhost"].includes(host)) {
  throw new Error(`debit.concurrency.test só roda no banco local (DATABASE_URL aponta para ${host}).`);
}

describe("debitar_creditos concorrente (seção 22)", () => {
  const a = new Client({ connectionString: DATABASE_URL });
  const b = new Client({ connectionString: DATABASE_URL });
  let marcaId = "";

  beforeAll(async () => {
    await Promise.all([a.connect(), b.connect()]);
    const { rows } = await a.query("insert into marcas (nome) values ($1) returning id", [`teste-concorrencia-${Date.now()}`]);
    marcaId = rows[0].id;
    // Exatamente o preço atual de gerar_video (12 no spec; 51 depois do MD-4): cabe um débito só.
    await a.query("select lancar_creditos($1, 'bonus', (select creditos from precos_acoes where acao = 'gerar_video'), null, 'teste de concorrência', null)", [marcaId]);
  });

  afterAll(async () => {
    await Promise.all([a.end(), b.end()]);
  });

  it("só um de dois débitos simultâneos passa e o saldo fica em 0", async () => {
    await a.query("begin");
    await b.query("begin");
    const debit = (c: Client) =>
      c.query("select debitar_creditos($1, 'gerar_video', 1, 'anuncio', null, null) as id", [marcaId]).then(
        async () => (await c.query("commit"), "ok"),
        async (e: Error) => (await c.query("rollback"), e.message),
      );
    const results = await Promise.all([debit(a), debit(b)]);
    expect(results.sort()).toEqual(["ok", "saldo_insuficiente"]);

    const { rows } = await a.query(
      "select saldo_creditos, (select sum(quantidade) from movimentacoes_creditos where marca_id = $1)::int as soma from marcas where id = $1",
      [marcaId],
    );
    expect(rows[0].saldo_creditos).toBe(0);
    expect(rows[0].soma).toBe(0);
  });
});
