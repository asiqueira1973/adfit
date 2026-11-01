import { z } from "zod";

/**
 * Schemas Zod dos corpos das rotas de admin (seção 13), com os limites da seção 7.3 e 11.7.
 * Usados pelas rotas e pelos testes.
 */
import { brandKitSchema } from "@/lib/schemas/brand";

export { brandKitSchema };

/** POST /api/admin/marcas — "dados do kit" (seção 13). */
export const createBrandSchema = brandKitSchema;

/** PATCH /api/admin/marcas/:id — editar kit e/ou pausar/reativar (seção 6.3). */
export const updateBrandSchema = brandKitSchema.partial().extend({
  ativa: z.boolean().optional(),
  // Caminho do logo já enviado ao bucket `marcas` (seção 6.4: `<marca_id>/logo/<arquivo>`).
  logo_path: z.string().regex(/^[0-9a-f-]{36}\/logo\/[^/]+$/).nullable().optional(),
});

/** POST /api/admin/usuarios — { email, nome, marca_id } (seção 13). */
export const inviteUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  nome: z.string().trim().min(1).max(80),
  marca_id: z.string().uuid(),
});

/** PATCH /api/admin/usuarios/:id — { ativo } (seção 13). */
export const setUserActiveSchema = z.object({ ativo: z.boolean() });

/** POST /api/admin/creditos — { marca_id, tipo, quantidade, valor_pago_centavos?, moeda?, observacao? } (seção 13). */
export const launchCreditsSchema = z.object({
  marca_id: z.string().uuid(),
  tipo: z.enum(["compra", "bonus", "ajuste_manual"]),
  quantidade: z.number().int().refine((n) => n !== 0),
  valor_pago_centavos: z.number().int().positive().nullable().optional(),
  moeda: z.enum(["brl", "usd", "eur"]).nullable().optional(),
  observacao: z.string().trim().max(500).nullable().optional(),
});

export type BrandKitInput = z.infer<typeof brandKitSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type LaunchCreditsInput = z.infer<typeof launchCreditsSchema>;
