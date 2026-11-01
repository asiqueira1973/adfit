import "server-only";
import { execFile, execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegStatic from "ffmpeg-static";
import { renderTextImage } from "./text-image";

const run = promisify(execFile);

let resolved: string | null = null;

/**
 * Caminho do ffmpeg empacotado (ffmpeg-static; divergência D-23: montagem na própria Vercel). O valor
 * do pacote depende do `__dirname`, que muda quando o código é empacotado (bug B-8: `/ROOT/…`); por
 * isso confere a existência e tenta os caminhos reais da função (monorepo: `node_modules` na raiz).
 */
export function ffmpegPath(): string {
  if (resolved) return resolved;
  const candidates = [
    ffmpegStatic,
    join(process.cwd(), "node_modules/ffmpeg-static/ffmpeg"),
    join(process.cwd(), "../../node_modules/ffmpeg-static/ffmpeg"),
    "/var/task/node_modules/ffmpeg-static/ffmpeg",
  ].filter((c): c is string => !!c);
  const found = candidates.find((c) => existsSync(c));
  if (!found) throw new Error(`ffmpeg_indisponivel: ${candidates.join(" | ")}`);
  resolved = found;
  return found;
}

/**
 * Fonte Inter Bold do repositório (regra 11.8), incluída no trace pelo next.config. Confere a
 * existência nos caminhos possíveis da função (o diretório de trabalho muda entre local e Vercel).
 */
export function fontPath(): string {
  const rel = "src/server/video/assets/Inter-Bold.ttf";
  const candidates = [join(process.cwd(), rel), join(process.cwd(), "apps/web", rel), join("/var/task/apps/web", rel), join("/var/task", rel)];
  return candidates.find((c) => existsSync(c)) ?? candidates[0];
}

export type AssembleInput = {
  /** Os 3 clipes, na ordem das cenas 1, 2, 3 (arquivos locais). */
  clips: [string, string, string];
  out: string;
  formato: "vertical_9_16" | "horizontal_16_9";
  /** Texto da tela de cada cena (até 2 linhas com `\n`); null = sem texto. A cena 3 não leva texto (11.3). */
  textos: [string | null, string | null, string | null];
  /** Logo da marca já em PNG (null = mostra o nome da marca no fecho). */
  logoPng: string | null;
  marca: string;
  cta: string;
  /** `cor_destaque` (#RRGGBB) do CTA; null = branco (11.8). */
  cor: string | null;
  oferta: string | null;
  /** Só para testes: recebe os argumentos do ffmpeg antes de rodar. */
  onCommand?: (args: string[]) => void;
};

const SCENE = 5;
const TOTAL = 15;
const CLOSING_START = 12.5;

/**
 * Monta o anúncio final com ffmpeg seguindo a regra 11.8 à risca:
 * - cenas 1, 2, 3 de 5 s cada, corte seco; clipe em outra proporção é recortado ao centro;
 * - 1080×1920 (vertical) ou 1920×1080 (horizontal), 30 fps;
 * - texto da cena em Inter Bold branco com sombra de 2 px a 50%, de 0,3 s a 4,7 s, fade de 0,2 s
 *   (desenhado em PNG por `renderTextImage` e sobreposto — o ffmpeg da Vercel não tem drawtext, B-8);
 *   área segura vertical entre 15% e 70% da altura; horizontal com margem de 6%;
 * - fecho de 12,5 s a 15 s: escurecimento de 40%, logo centralizado (40% da largura no vertical,
 *   20% no horizontal), CTA abaixo na cor de destaque (branco se nula) e oferta abaixo do CTA;
 * - faixa AAC silenciosa; H.264 High, CRF 20, preset veryfast, +faststart.
 * Recebe: AssembleInput. Devolve: nada (grava `out`). Lança se o ffmpeg falhar.
 */
export async function assembleVideo(input: AssembleInput): Promise<void> {
  const vertical = input.formato === "vertical_9_16";
  const [W, H] = vertical ? [1080, 1920] : [1920, 1080];
  const work = mkdtempSync(join(tmpdir(), "adfit-mont-"));
  try {
    const filters: string[] = [];
    // Textos viram PNG transparentes sobrepostos com overlay (bug B-8: sem drawtext no ffmpeg da Vercel).
    // Entradas: 0–2 clipes, 3 logo (ou 2×2 preto), 4 áudio mudo, 5… imagens de texto.
    const images: string[] = [];
    const addImage = async (lines: string[], size: number, color: string) => {
      const img = await renderTextImage(lines, size, color);
      const file = join(work, `txt${images.length}.png`);
      writeFileSync(file, img.png);
      images.push(file);
      return { index: 4 + images.length, ...img };
    };

    // 1. Normaliza e junta os clipes (recorte ao centro, 5 s exatos, 30 fps).
    for (let i = 0; i < 3; i++) {
      filters.push(`[${i}:v]trim=0:${SCENE},setpts=PTS-STARTPTS,fps=30,scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,format=yuv420p[v${i}]`);
    }
    filters.push(`[v0][v1][v2]concat=n=3:v=1:a=0[base]`);
    let last = "base";
    const chain = (f: string) => {
      const next = `s${filters.length}`;
      filters.push(`[${last}]${f}[${next}]`);
      last = next;
    };
    /** Sobrepõe a imagem `index` centralizada na horizontal, com topo em `y`, entre `from` e `to` (fade opcional). */
    const overlayImage = (index: number, y: number, from: number, to: number, fade: boolean) => {
      const src = `i${index}`;
      const fades = fade ? `,fade=t=in:st=${from}:d=0.2:alpha=1,fade=t=out:st=${(to - 0.2).toFixed(2)}:d=0.2:alpha=1` : "";
      filters.push(`[${index}:v]format=rgba${fades}[${src}]`);
      const next = `s${filters.length}`;
      filters.push(`[${last}][${src}]overlay=x=(W-w)/2:y=${Math.round(y)}:enable='between(t,${from},${to})'[${next}]`);
      last = next;
    };

    // 2. Texto da cena (cenas 1 e 2): de 0,3 s a 4,7 s, fade de 0,2 s, centralizado na área segura.
    const textSize = vertical ? 58 : 56;
    const textCenterY = vertical ? Math.round(H * 0.6) : Math.round(H * 0.78);
    for (const [i, texto] of input.textos.entries()) {
      if (!texto || i === 2) continue;
      const img = await addImage(texto.split("\n").slice(0, 2), textSize, "#FFFFFF");
      overlayImage(img.index, textCenterY - img.height / 2, i * SCENE + 0.3, i * SCENE + 4.7, true);
    }

    // 3. Fecho: escurecimento de 40%, logo (ou nome da marca), CTA na cor de destaque e oferta.
    const closing = `enable='gte(t,${CLOSING_START})'`;
    chain(`drawbox=x=0:y=0:w=iw:h=ih:color=black@0.4:t=fill:${closing}`);
    const logoW = Math.round(W * (vertical ? 0.4 : 0.2));
    const centerY = Math.round(H * 0.45);
    let below: number;
    if (input.logoPng) {
      filters.push(`[3:v]scale=${logoW}:-1[logo]`);
      const next = `s${filters.length}`;
      filters.push(`[${last}][logo]overlay=x=(W-w)/2:y=${centerY}-h/2:${closing}[${next}]`);
      last = next;
      below = centerY + Math.round(logoW / 2.5);
    } else {
      const name = await addImage([input.marca], vertical ? 76 : 72, "#FFFFFF");
      overlayImage(name.index, centerY - name.height / 2, CLOSING_START, TOTAL, false);
      below = centerY + name.height / 2;
    }
    const ctaSize = vertical ? 54 : 48;
    const cta = await addImage([input.cta], ctaSize, /^#[0-9a-f]{6}$/i.test(input.cor ?? "") ? input.cor! : "#FFFFFF");
    overlayImage(cta.index, below + 40, CLOSING_START, TOTAL, false);
    if (input.oferta) {
      const oferta = await addImage([input.oferta], Math.round(ctaSize * 0.75), "#FFFFFF");
      overlayImage(oferta.index, below + 40 + cta.height + 12, CLOSING_START, TOTAL, false);
    }

    const args = [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      ...input.clips.flatMap((c) => ["-i", c]),
      ...(input.logoPng ? ["-i", input.logoPng] : ["-f", "lavfi", "-i", "color=c=black:s=2x2"]),
      "-f",
      "lavfi",
      "-t",
      String(TOTAL),
      "-i",
      "anullsrc=r=48000:cl=stereo",
      ...images.flatMap((f) => ["-loop", "1", "-framerate", "30", "-t", String(TOTAL), "-i", f]),
      "-filter_complex",
      filters.join(";"),
      "-map",
      `[${last}]`,
      "-map",
      "4:a",
      "-t",
      String(TOTAL),
      "-r",
      "30",
      "-c:v",
      "libx264",
      "-profile:v",
      "high",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "20",
      "-preset",
      "veryfast",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      input.out,
    ];
    input.onCommand?.(args);
    try {
      await run(ffmpegPath(), args, { maxBuffer: 16 * 1024 * 1024 });
    } catch (e) {
      // O motivo real fica no stderr do ffmpeg; a mensagem padrão só traz o comando (bug B-8).
      const stderr = String((e as { stderr?: string }).stderr ?? "").trim();
      throw new Error(`ffmpeg: ${stderr.slice(-400) || (e instanceof Error ? e.message.slice(0, 200) : String(e))}`);
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

export type MediaInfo = {
  duration: number;
  video: { codec: string; width: number; height: number; fps: number; profile: string } | null;
  audio: { codec: string } | null;
};

/**
 * Lê duração, vídeo e áudio de um arquivo com o próprio ffmpeg (sem ffprobe no pacote).
 * Recebe: caminho. Devolve: MediaInfo.
 */
export function ffprobeInfo(file: string): MediaInfo {
  let stderr = "";
  try {
    execFileSync(ffmpegPath(), ["-hide_banner", "-i", file], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (e) {
    stderr = String((e as { stderr?: Buffer }).stderr ?? "");
  }
  const d = stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const v = stderr.match(/Video: (\w+) \(([^)]+)\)[^\n]*?, (\d+)x(\d+)[^\n]*?, ([\d.]+) fps/);
  const a = stderr.match(/Audio: (\w+)/);
  return {
    duration: d ? Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]) : 0,
    video: v ? { codec: v[1], profile: v[2], width: Number(v[3]), height: Number(v[4]), fps: Math.round(Number(v[5])) } : null,
    audio: a ? { codec: a[1] } : null,
  };
}
