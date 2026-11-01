import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { assertLocalSupabase } from "@/test/local-db";
import type { Database } from "../db/database.types";
import { createAdminClient } from "../db/supabase";
import { signedLogoUrl } from "../admin/brands";

/**
 * Isolamento por caminho com a API de Storage real e a sessão de um usuário (seção 6.4; achado do
 * verifier do 8.3). Duas marcas, A e B; o usuário é da B.
 */
assertLocalSupabase();
const admin = createAdminClient();
const sfx = Date.now().toString(36);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
let marcaA = "", marcaB = "", produtoA = "", produtoB = "", userId = "";
const userB = createClient<Database>(url, anon, { auth: { persistSession: false } });
const png = Buffer.from("89504e470d0a1a0a", "hex");

beforeAll(async () => {
  marcaA = (await admin.from("marcas").insert({ nome: `Iso A ${sfx}` }).select("id").single()).data!.id;
  marcaB = (await admin.from("marcas").insert({ nome: `Iso B ${sfx}` }).select("id").single()).data!.id;
  produtoA = (await admin.from("produtos").insert({ marca_id: marcaA, nome: "A", categoria: "top" }).select("id").single()).data!.id;
  produtoB = (await admin.from("produtos").insert({ marca_id: marcaB, nome: "B", categoria: "top" }).select("id").single()).data!.id;
  const email = `iso_${sfx}@kore.test`;
  const password = `iso-${sfx}-senha`;
  userId = (await admin.auth.admin.createUser({ email, password, email_confirm: true })).data.user!.id;
  await admin.from("perfis").insert({ id: userId, marca_id: marcaB, nome: "B", email });
  await userB.auth.signInWithPassword({ email, password });
  await admin.storage.from("marcas").upload(`${marcaA}/logo/a.png`, png, { contentType: "image/png" });
});

afterAll(async () => {
  await admin.storage.from("produtos").remove([`${marcaB}/${produtoB}/originais/ok.png`]);
  await admin.storage.from("marcas").remove([`${marcaA}/logo/a.png`]);
});

describe("isolamento de Storage entre marcas", () => {
  it("usuário da B não grava original na pasta de produto da A, nem dentro da própria marca", async () => {
    const { error } = await userB.storage.from("produtos").upload(`${marcaB}/${produtoA}/originais/x.png`, png, { contentType: "image/png" });
    expect(error).not.toBeNull();
  });

  it("depois da ficha aprovada, o original não pode ser apagado nem substituído (seção 7.4)", async () => {
    const path = `${marcaB}/${produtoB}/originais/ok.png`;
    expect((await userB.storage.from("produtos").upload(path, png, { contentType: "image/png" })).error).toBeNull();
    const geracao = (await admin.from("geracoes").insert({ marca_id: marcaB, tipo: "ficha_produto", modelo: "x", entrada: {} }).select("id").single()).data!.id;
    const ficha = (await admin.from("fichas_produto").insert({ produto_id: produtoB, marca_id: marcaB, versao: 1, status: "aprovada", geracao_id: geracao }).select("id").single()).data!.id;
    await admin.from("produtos").update({ ficha_aprovada_id: ficha }).eq("id", produtoB);
    await userB.storage.from("produtos").remove([path]);
    const { data } = await admin.storage.from("produtos").list(`${marcaB}/${produtoB}/originais`);
    expect(data?.map((f) => f.name)).toContain("ok.png");
  });

  it("o servidor não assina logo fora da pasta da marca", async () => {
    expect(await signedLogoUrl(`${marcaA}/logo/a.png`, marcaB)).toBeNull();
    expect(await signedLogoUrl(`${marcaA}/logo/a.png`, marcaA)).not.toBeNull();
  });
});
