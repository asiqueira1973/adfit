/**
 * Seed do primeiro administrador e dos pacotes de créditos (seções 5 e 7.6).
 * Recebe (variáveis de ambiente): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_SENHA e, opcionalmente, SEED_STRIPE_PRICE_PACOTE_50/120.
 * Faz: cria o usuário no Auth (ou reaproveita, se o e-mail já existir no Auth compartilhado),
 *   grava `perfis` com papel admin_plataforma e marca_id nulo, e cria os pacotes da regra 11.2.9
 *   quando os Price IDs da Stripe forem informados. Idempotente.
 * Uso local:  npm run seed:admin
 * Uso remoto: npx tsx --env-file=<arquivo com as variáveis do projeto remoto> scripts/seed-admin.ts
 */
import { createClient } from "@supabase/supabase-js";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta a variável ${name}`);
  return value;
}

async function findUserIdByEmail(supabase: ReturnType<typeof createClient>, email: string): Promise<string | null> {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  const supabase = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = required("SEED_ADMIN_EMAIL").trim().toLowerCase();
  const senha = required("SEED_ADMIN_SENHA");
  if (senha.length < 8) throw new Error("SEED_ADMIN_SENHA precisa ter pelo menos 8 caracteres (seção 6.2).");

  let userId = await findUserIdByEmail(supabase, email);
  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({ email, password: senha, email_confirm: true });
    if (error) throw error;
    userId = data.user.id;
    console.log(`Usuário admin criado: ${email}`);
  } else {
    console.log(`Usuário já existia no Auth: ${email} (senha mantida)`);
  }

  const { error: perfilError } = await supabase
    .from("perfis")
    .upsert({ id: userId, email, nome: "Administrador", papel: "admin_plataforma", marca_id: null, ativo: true }, { onConflict: "id" });
  if (perfilError) throw perfilError;
  console.log("Perfil admin_plataforma gravado.");

  // Pacotes iniciais da regra 11.2.9 (valores a confirmar na pergunta 25.1).
  const packs = [
    { env: "SEED_STRIPE_PRICE_PACOTE_50", nome: "Pacote 50", creditos: 50, preco_centavos: 3000, moeda: "usd", ordem: 1 },
    { env: "SEED_STRIPE_PRICE_PACOTE_120", nome: "Pacote 120", creditos: 120, preco_centavos: 6500, moeda: "usd", ordem: 2 },
  ];
  for (const p of packs) {
    const priceId = process.env[p.env];
    if (!priceId) {
      console.log(`${p.nome}: ${p.env} não informado, pacote não criado.`);
      continue;
    }
    const { error } = await supabase.from("pacotes_creditos").upsert(
      { nome: p.nome, creditos: p.creditos, preco_centavos: p.preco_centavos, moeda: p.moeda, stripe_price_id: priceId, ordem: p.ordem },
      { onConflict: "stripe_price_id" },
    );
    if (error) throw error;
    console.log(`${p.nome}: gravado (${priceId}).`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
