import "server-only";
import { execFile, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegStatic from "ffmpeg-static";

const run = promisify(execFile);

/** Caminho do ffmpeg empacotado (ffmpeg-static; divergência D-23: montagem na própria Vercel). */
export function ffmpegPath(): string {
  if (!ffmpegStatic) throw new Error("ffmpeg_indisponivel");
  return ffmpegStatic;
}

/** Fonte Inter Bold do repositório (regra 11.8), lida do disco (incluída no trace pelo next.config). */
export function fontPath(): string {
  return join(process.cwd(), "src/server/video/assets/Inter-Bold.ttf");
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
};

const SCENE = 5;
const TOTAL = 15;
const CLOSING_START = 12.5;

/**
 * Monta o anúncio final com ffmpeg seguindo a regra 11.8 à risca:
 * - cenas 1, 2, 3 de 5 s cada, corte seco; clipe em outra proporção é recortado ao centro;
 * - 1080×1920 (vertical) ou 1920×1080 (horizontal), 30 fps;
 * - texto da cena em Inter Bold branco com sombra de 2 px a 50%, de 0,3 s a 4,7 s, fade de 0,2 s;
 *   área segura vertical entre 15% e 70% da altura; horizontal com margem de 6%;
 * - fecho de 12,5 s a 15 s: escurecimento de 40%, logo centralizado (40% da largura no vertical,
 *   20% no horizontal), CTA abaixo na cor de destaque (branco se nula) e oferta abaixo do CTA;
 * - faixa AAC silenciosa; H.264 High, CRF 20, preset veryfast, +faststart.
 * Recebe: AssembleInput. Devolve: nada (grava `out`). Lança se o ffmpeg falhar.
 */
export async function assembleVideo(input: AssembleInput): Promise<void> {
  const vertical = input.formato === "vertical_9_16";
  const [W, H] = vertical ? [1080, 1920] : [1920, 1080];
  const font = fontPath().replace(/\\/g, "/").replace(/:/g, "\\:");
  const work = mkdtempSync(join(tmpdir(), "adfit-mont-"));
  try {
    // Textos vão por arquivo (textfile + expansion=none): nada de escapar aspas, %, : ou \.
    let n = 0;
    const textFile = (text: string) => {
      const p = join(work, `t${n++}.txt`);
      writeFileSync(p, text);
      return p.replace(/\\/g, "/").replace(/:/g, "\\:");
    };
    const shadow = "fontcolor=white:shadowcolor=black@0.5:shadowx=2:shadowy=2";
    const filters: string[] = [];

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

    // 2. Texto da cena (cenas 1 e 2), uma linha por drawtext, centralizadas.
    const textSize = vertical ? 58 : 56;
    const lineGap = Math.round(textSize * 1.3);
    const textCenterY = vertical ? Math.round(H * 0.6) : Math.round(H * 0.78);
    input.textos.forEach((texto, i) => {
      if (!texto || i === 2) return;
      const start = i * SCENE;
      const a = start + 0.3;
      const b = start + 4.7;
      const alpha = `if(lt(t,${a + 0.2}),(t-${a})/0.2,if(gt(t,${b - 0.2}),(${b}-t)/0.2,1))`;
      const lines = texto.split("\n").slice(0, 2);
      lines.forEach((line, j) => {
        const y = textCenterY - ((lines.length - 1) * lineGap) / 2 + j * lineGap - textSize / 2;
        chain(`drawtext=fontfile='${font}':textfile='${textFile(line)}':expansion=none:fontsize=${textSize}:${shadow}:x=(w-text_w)/2:y=${Math.round(y)}:enable='between(t,${a},${b})':alpha='${alpha}'`);
      });
    });

    // 3. Fecho: escurecimento de 40%, logo (ou nome), CTA e oferta.
    const closing = `enable='gte(t,${CLOSING_START})'`;
    chain(`drawbox=x=0:y=0:w=iw:h=ih:color=black@0.4:t=fill:${closing}`);
    const logoW = Math.round(W * (vertical ? 0.4 : 0.2));
    const centerY = Math.round(H * 0.45);
    let below = centerY;
    if (input.logoPng) {
      filters.push(`[3:v]scale=${logoW}:-1[logo]`);
      const next = `s${filters.length}`;
      filters.push(`[${last}][logo]overlay=x=(W-w)/2:y=${centerY}-h/2:${closing}[${next}]`);
      last = next;
      below = centerY + Math.round(logoW / 2.5);
    } else {
      const size = vertical ? 76 : 72;
      chain(`drawtext=fontfile='${font}':textfile='${textFile(input.marca)}':expansion=none:fontsize=${size}:${shadow}:x=(w-text_w)/2:y=${centerY - size / 2}:${closing}`);
      below = centerY + size;
    }
    const ctaSize = vertical ? 54 : 48;
    const ctaColor = /^#[0-9a-f]{6}$/i.test(input.cor ?? "") ? `0x${input.cor!.slice(1)}` : "white";
    chain(`drawtext=fontfile='${font}':textfile='${textFile(input.cta)}':expansion=none:fontsize=${ctaSize}:fontcolor=${ctaColor}:shadowcolor=black@0.5:shadowx=2:shadowy=2:x=(w-text_w)/2:y=${below + 40}:${closing}`);
    if (input.oferta) {
      chain(`drawtext=fontfile='${font}':textfile='${textFile(input.oferta)}':expansion=none:fontsize=${Math.round(ctaSize * 0.75)}:${shadow}:x=(w-text_w)/2:y=${below + 40 + ctaSize + 24}:${closing}`);
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
    await run(ffmpegPath(), args, { maxBuffer: 16 * 1024 * 1024 });
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
