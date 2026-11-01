/**
 * Regras de arquivo das fotos de produto e do logo (critérios 8.3; seção 7.3 e 17).
 * Fotos: JPG, PNG, HEIC/HEIF, WEBP até 10 MB. Logo: PNG, SVG, JPG até 5 MB.
 */
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/heif": "heic",
  "image/webp": "webp",
};
export const MAX_PHOTOS = 4;

/**
 * Descobre a extensão de uma foto pelo tipo, ou pela extensão do nome (alguns navegadores mandam
 * HEIC com tipo vazio). Recebe: tipo MIME e nome. Devolve: "jpg" | "png" | "heic" | "webp" | null.
 */
export function photoExtension(type: string, name: string): string | null {
  if (PHOTO_TYPES[type]) return PHOTO_TYPES[type];
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (["jpg", "jpeg"].includes(ext)) return "jpg";
  if (["png", "webp"].includes(ext)) return ext;
  if (["heic", "heif"].includes(ext)) return "heic";
  return null;
}

/**
 * Valida uma foto antes do envio (critério 8.3: "arquivo > 10 MB ou formato não suportado").
 * Recebe: tipo, nome e tamanho. Devolve: null se ok, ou o motivo ("formato" | "tamanho").
 */
export function validatePhoto(file: { type: string; name: string; size: number }): "formato" | "tamanho" | null {
  if (!photoExtension(file.type, file.name)) return "formato";
  if (file.size > PHOTO_MAX_BYTES) return "tamanho";
  return null;
}

/** Tipo MIME de upload a partir da extensão normalizada. */
export function contentTypeFor(ext: string): string {
  return { jpg: "image/jpeg", png: "image/png", heic: "image/heic", webp: "image/webp" }[ext] ?? "application/octet-stream";
}
