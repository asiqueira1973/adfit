import "server-only";
import { z } from "zod";
import { createAdminClient } from "../db/supabase";
import { BusinessError } from "../api/http";
import { getStripe, type StripeApi } from "../stripe/client";

/** Corpo de POST /api/admin/pacotes (seção 13). */
export const packageSchema = z.object({
  nome: z.string().trim().min(1).max(60),
  creditos: z.number().int().positive(),
  preco_centavos: z.number().int().positive(),
  moeda: z.string().trim().toLowerCase().regex(/^[a-z]{3}$/),
  stripe_price_id: z.string().trim().regex(/^price_\w+$/),
  ativo: z.boolean().default(true),
  ordem: z.number().int().min(0).max(999).default(1),
});
/** Corpo de PATCH /api/admin/pacotes/:id. */
export const packagePatchSchema = packageSchema.partial();

/** Corpo de PUT /api/admin/configuracoes (seção 13: creditos ≥ 0). */
export const settingsSchema = z.object({
  precos: z.array(z.object({ acao: z.enum(["gerar_ficha", "refazer_ficha", "gerar_roteiro_quadros", "refazer_quadro", "gerar_video", "refazer_clipe", "remontar_texto"]), creditos: z.number().int().min(0) })).optional(),
  configuracoes: z.array(z.object({ chave: z.string().min(1).max(60), valor: z.unknown() })).optional(),
});

/**
 * Confere na Stripe que o Price existe, está ativo, é avulso (one_time — `mode=payment`, seção 4.5)
 * e tem a mesma moeda e o mesmo valor do pacote (seção 13). Recebe: dados e cliente Stripe.
 * Lança `price_invalido` se algo não bate.
 */
export async function assertStripePrice(input: { stripe_price_id: string; preco_centavos: number; moeda: string }, stripe: StripeApi = getStripe()): Promise<void> {
  const price = await stripe.prices.retrieve(input.stripe_price_id).catch(() => null);
  if (!price || !price.active || price.type !== "one_time" || price.currency !== input.moeda || price.unit_amount !== input.preco_centavos) {
    throw new BusinessError("price_invalido");
  }
}

/** Todos os pacotes (admin vê inativos também). */
export async function listPackagesForAdmin() {
  const { data, error } = await createAdminClient().from("pacotes_creditos").select("*").order("ordem").order("creditos");
  if (error) throw error;
  return data ?? [];
}

/** Cria pacote (POST /api/admin/pacotes) depois de validar o Price na Stripe. Devolve o id. */
export async function createPackage(input: z.infer<typeof packageSchema>, stripe?: StripeApi): Promise<string> {
  await assertStripePrice(input, stripe);
  const { data, error } = await createAdminClient().from("pacotes_creditos").insert(input).select("id").single();
  if (error) throw error;
  return data.id;
}

/**
 * Edita/ativa/desativa pacote (PATCH /api/admin/pacotes/:id). Se mudar preço, moeda ou Price,
 * valida de novo na Stripe com os valores resultantes. Pacote nunca é excluído (seção 7.4).
 */
export async function updatePackage(id: string, input: z.infer<typeof packagePatchSchema>, stripe?: StripeApi): Promise<void> {
  const db = createAdminClient();
  const { data: atual } = await db.from("pacotes_creditos").select("*").eq("id", id).maybeSingle();
  if (!atual) throw new BusinessError("pacote_inexistente");
  if (Object.values(input).every((v) => v === undefined)) throw new BusinessError("validacao");
  if (input.stripe_price_id !== undefined || input.preco_centavos !== undefined || input.moeda !== undefined) {
    await assertStripePrice({ ...atual, ...input } as { stripe_price_id: string; preco_centavos: number; moeda: string }, stripe);
  }
  const { error } = await db.from("pacotes_creditos").update(input).eq("id", id);
  if (error) throw error;
}

/** Preços por ação e chaves de configuração (regras 11.1 e 11.6) para a tela do admin. */
export async function getSettings() {
  const db = createAdminClient();
  const [{ data: precos }, { data: configs }] = await Promise.all([
    db.from("precos_acoes").select("acao, creditos, descricao"),
    db.from("configuracoes").select("chave, valor, descricao").order("chave"),
  ]);
  return { precos: precos ?? [], configuracoes: configs ?? [] };
}

/**
 * Salva preços e configurações (PUT /api/admin/configuracoes). Mudança de preço vale só para ações
 * iniciadas depois (regra 11.2.7: o débito lê o preço no momento). Só atualiza chaves existentes.
 */
export async function saveSettings(input: z.infer<typeof settingsSchema>): Promise<void> {
  const db = createAdminClient();
  for (const p of input.precos ?? []) {
    const { error } = await db.from("precos_acoes").update({ creditos: p.creditos, atualizado_em: new Date().toISOString() }).eq("acao", p.acao);
    if (error) throw error;
  }
  for (const c of input.configuracoes ?? []) {
    const { error } = await db.from("configuracoes").update({ valor: c.valor as never, atualizado_em: new Date().toISOString() }).eq("chave", c.chave);
    if (error) throw error;
  }
}
