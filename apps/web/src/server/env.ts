import "server-only";
import { z } from "zod";

/**
 * Variáveis de ambiente do servidor (seção 18), validadas com Zod na primeira leitura.
 * `publicServerEnv` só exige as públicas (login funciona sem segredos); `serverEnv` exige também
 * os segredos, que ficam só aqui e em apps/worker (seção 20, hook guard-secrets).
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  APP_URL: z.string().url(),
});
const secretSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

/** Lança erro listando as variáveis que faltam. */
function parse<T extends z.ZodTypeAny>(schema: T): z.infer<T> {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Variáveis de ambiente inválidas: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`);
  }
  return parsed.data;
}

/** Variáveis públicas do servidor (URL do Supabase, chave anon, APP_URL). */
export function publicServerEnv(): z.infer<typeof publicSchema> {
  return parse(publicSchema);
}

const stripeSchema = z.object({
  STRIPE_SECRET_KEY: z.string().regex(/^sk_(test|live)_/),
  STRIPE_WEBHOOK_SECRET: z.string().regex(/^whsec_/).optional(),
});

/** Chaves da Stripe (seção 4.5). Só servidor; nunca NEXT_PUBLIC_ (seção 20). */
export function stripeEnv(): z.infer<typeof stripeSchema> {
  return parse(stripeSchema);
}

/** Variáveis do servidor incluindo segredos (service_role). Só para o cliente admin. */
export function serverEnv(): z.infer<typeof secretSchema> {
  return parse(secretSchema);
}

const higgsfieldSchema = z.object({
  HF_API_KEY_ID: z.string().min(1),
  HF_API_KEY_SECRET: z.string().min(1),
  HF_WEBHOOK_TOKEN: z.string().min(16),
  HF_WEBHOOK_SECRET: z.string().regex(/^whsec_/).optional(),
});

/** Chaves da Higgsfield API (seção 4.3) e do webhook (token na query; assinatura opcional, D-16). */
export function higgsfieldEnv(): z.infer<typeof higgsfieldSchema> {
  return parse(higgsfieldSchema);
}

const anthropicSchema = z.object({ ANTHROPIC_API_KEY: z.string().min(1) });

/** Chave da API do Claude (seção 4.2). Só servidor. */
export function anthropicEnv(): z.infer<typeof anthropicSchema> {
  return parse(anthropicSchema);
}
