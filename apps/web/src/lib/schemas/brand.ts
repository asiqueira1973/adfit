import { z } from "zod";

/**
 * Schema do kit da marca (seção 7.3, marcas) + idioma do texto dos vídeos (MD-1), compartilhado
 * entre a tela Marca (navegador) e as rotas de admin (servidor). Só Zod — nada de servidor aqui.
 */
const instagram = z
  .string()
  .trim()
  .transform((v) => v.replace(/^@/, ""))
  .pipe(z.string().regex(/^[A-Za-z0-9._]{1,30}$/, "instagram"))
  .or(z.literal("").transform(() => null))
  .nullable();
const cor = z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "cor").or(z.literal("").transform(() => null)).nullable();
const textoOpcional = (max: number) => z.string().trim().max(max).transform((v) => (v === "" ? null : v)).nullable();

export const brandKitSchema = z.object({
  nome: z.string().trim().min(1).max(80),
  instagram: instagram.optional(),
  cor_destaque: cor.optional(),
  cta_padrao: z.string().trim().min(1).max(40).optional(),
  tom_de_voz: textoOpcional(200).optional(),
  idioma_anuncios: z.enum(["pt_br", "en"]).optional(),
});

