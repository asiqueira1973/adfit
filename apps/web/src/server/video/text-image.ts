import "server-only";
import { readFileSync } from "node:fs";
import { parse, type Font, type Glyph } from "opentype.js";
import sharp from "sharp";
import { fontPath } from "./assemble";

let font: Font | null = null;

/** Carrega a Inter Bold do repositório uma vez (regra 11.8). */
function interBold(): Font {
  if (!font) {
    const buf = readFileSync(fontPath());
    font = parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  }
  return font;
}

export type TextImage = { png: Buffer; width: number; height: number };

/**
 * Desenha uma linha letra a letra (sem as substituições avançadas da fonte, que o opentype.js não
 * suporta na Inter 4 — "substFormat 2 is not yet supported"). Para texto latino com acentos basta:
 * cada caractere tem o seu desenho pré-composto. Devolve: path SVG e largura.
 */
function layoutLine(f: Font, text: string, x0: number, y: number, size: number): { d: string; width: number } {
  const scale = size / f.unitsPerEm;
  let x = x0;
  let d = "";
  let prev: Glyph | null = null;
  for (const ch of Array.from(text)) {
    const glyph = f.charToGlyph(ch);
    if (prev) x += f.getKerningValue(prev, glyph) * scale;
    d += glyph.getPath(x, y, size).toPathData(2);
    x += (glyph.advanceWidth ?? 0) * scale;
    prev = glyph;
  }
  return { d, width: x - x0 };
}

/**
 * Desenha linhas de texto como PNG transparente (bug B-8: o ffmpeg Linux da Vercel não tem o filtro
 * `drawtext`; o vídeo sobrepõe esta imagem com `overlay`). Inter Bold, cada linha centralizada, com
 * sombra preta de 2 px a 50% (regra 11.8). Os contornos vêm da fonte (opentype.js), então não depende
 * de fonte instalada no servidor. Recebe: linhas, tamanho em px e cor (#RRGGBB). Devolve: PNG e medidas.
 */
export async function renderTextImage(lines: string[], size: number, color: string): Promise<TextImage> {
  const f = interBold();
  const lineHeight = Math.round(size * 1.3);
  const pad = 4;
  const widths = lines.map((l) => layoutLine(f, l, 0, 0, size).width);
  const width = Math.ceil(Math.max(1, ...widths)) + pad * 2 + 2;
  const height = lineHeight * lines.length + pad * 2 + 2;
  const ascent = (f.ascender / f.unitsPerEm) * size;
  const top = (lineHeight - size * ((f.ascender - f.descender) / f.unitsPerEm)) / 2;
  const paths = lines.map((l, i) => {
    const x = pad + (width - pad * 2 - 2 - widths[i]) / 2;
    const y = pad + i * lineHeight + top + ascent;
    return layoutLine(f, l, x, y, size).d;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<g transform="translate(2,2)" fill="#000" fill-opacity="0.5">${paths.map((d) => `<path d="${d}"/>`).join("")}</g>
<g fill="${/^#[0-9a-f]{6}$/i.test(color) ? color : "#FFFFFF"}">${paths.map((d) => `<path d="${d}"/>`).join("")}</g>
</svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return { png, width, height };
}

/**
 * Como `renderTextImage`, mas reduz o tamanho da fonte até a imagem caber em `maxWidth` (verificador,
 * 01/11/2026: 32 maiúsculas a 58 px davam 1214 px no vertical de 1080). Recebe: linhas, tamanho,
 * cor e largura máxima. Devolve: PNG e medidas.
 */
export async function fitTextImage(lines: string[], size: number, color: string, maxWidth: number): Promise<TextImage> {
  const first = await renderTextImage(lines, size, color);
  if (first.width <= maxWidth) return first;
  const smaller = Math.max(16, Math.floor((size * (maxWidth - 12)) / first.width));
  return renderTextImage(lines, smaller, color);
}
