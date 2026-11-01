import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { assembleVideo, ffmpegPath, ffprobeInfo } from "./assemble";

/**
 * Montagem do vídeo (regra 11.8; critérios 8.6/8.7; divergência D-23: ffmpeg na própria Vercel).
 * Clipes de teste gerados com `testsrc` (seção 22): 15 s ±0,2, resolução do formato, faixa de áudio
 * AAC, H.264 30 fps, e o quadro do fecho (escurecido, com logo) diferente do quadro da cena.
 */
const dir = mkdtempSync(join(tmpdir(), "adfit-video-"));

function clip(name: string, size: string, color: string): string {
  const out = join(dir, name);
  execFileSync(ffmpegPath(), ["-y", "-f", "lavfi", "-i", `testsrc=size=${size}:rate=24:duration=5.2`, "-vf", `drawbox=c=${color}@0.5:t=fill`, "-pix_fmt", "yuv420p", out], { stdio: "ignore" });
  return out;
}

function frameMean(video: string, at: number): number {
  const png = join(dir, `f-${at}-${Math.random().toString(36).slice(2)}.png`);
  execFileSync(ffmpegPath(), ["-y", "-ss", String(at), "-i", video, "-frames:v", "1", png], { stdio: "ignore" });
  const r = spawnSync(ffmpegPath(), ["-i", png, "-vf", "signalstats,metadata=print:key=lavfi.signalstats.YAVG", "-f", "null", "-"], { encoding: "utf8" });
  return Number(`${r.stdout}${r.stderr}`.match(/YAVG=([\d.]+)/)?.[1] ?? "0");
}

describe("montagem do vídeo (11.8)", () => {
  it("vertical: 15 s, 1080×1920, H.264 30 fps, AAC silencioso; fecho escurecido com logo", async () => {
    const logo = join(dir, "logo.png");
    await sharp({ create: { width: 400, height: 200, channels: 4, background: { r: 198, g: 244, b: 50, alpha: 1 } } }).png().toFile(logo);
    const out = join(dir, "v.mp4");
    // Clipe 2 em 16:9 para exercitar o recorte ao centro.
    await assembleVideo({
      clips: [clip("c1.mp4", "720x1280", "red"), clip("c2.mp4", "1280x720", "green"), clip("c3.mp4", "720x1280", "blue")],
      out,
      formato: "vertical_9_16",
      textos: ["Firme do começo\nao fim", "Sustentação que aguenta", null],
      logoPng: logo,
      marca: "Marca Teste",
      cta: "Compre pelo link da bio",
      cor: "#C6F432",
      oferta: "20% OFF esta semana",
    });
    const info = ffprobeInfo(out);
    expect(info.duration).toBeGreaterThan(14.8);
    expect(info.duration).toBeLessThan(15.2);
    expect(info.video).toMatchObject({ codec: "h264", width: 1080, height: 1920, fps: 30, profile: "High" });
    expect(info.audio?.codec).toBe("aac");
    expect(Math.abs(frameMean(out, 14) - frameMean(out, 11))).toBeGreaterThan(3);
  }, 120_000);

  it("horizontal sem logo nem texto: 1920×1080, nome da marca no fecho", async () => {
    const out = join(dir, "h.mp4");
    await assembleVideo({
      clips: [clip("h1.mp4", "1280x720", "red"), clip("h2.mp4", "1280x720", "green"), clip("h3.mp4", "720x1280", "blue")],
      out,
      formato: "horizontal_16_9",
      textos: [null, null, null],
      logoPng: null,
      marca: "Marca Teste",
      cta: "Shop now",
      cor: null,
      oferta: null,
    });
    const info = ffprobeInfo(out);
    expect(info.video).toMatchObject({ width: 1920, height: 1080 });
    expect(info.duration).toBeGreaterThan(14.8);
  }, 120_000);

  it("não usa drawtext (o ffmpeg Linux da Vercel não tem esse filtro — bug B-8)", async () => {
    let graph = "";
    await assembleVideo({
      clips: [clip("d1.mp4", "720x1280", "red"), clip("d2.mp4", "720x1280", "green"), clip("d3.mp4", "720x1280", "blue")],
      out: join(dir, "d.mp4"),
      formato: "vertical_9_16",
      textos: ["Texto 1", "Texto 2", null],
      logoPng: null,
      marca: "Marca",
      cta: "Compre",
      cor: "#C6F432",
      oferta: "10% OFF",
      onCommand: (args) => (graph = args[args.indexOf("-filter_complex") + 1]),
    });
    expect(graph).not.toContain("drawtext");
    expect(graph).toContain("overlay");
  }, 120_000);

  it("texto com caracteres especiais não quebra o filtro", async () => {
    const out = join(dir, "esc.mp4");
    writeFileSync(join(dir, "x.txt"), "");
    await expect(
      assembleVideo({
        clips: [clip("e1.mp4", "720x1280", "red"), clip("e2.mp4", "720x1280", "green"), clip("e3.mp4", "720x1280", "blue")],
        out,
        formato: "vertical_9_16",
        textos: ["50% OFF: 'agora' \\ já!", "Dá: 100%", null],
        logoPng: null,
        marca: "D'Ávila & Co.",
        cta: "Use: CUPOM10 %",
        cor: "#FF0000",
        oferta: "Só hoje: 10%",
      }),
    ).resolves.toBeUndefined();
  }, 120_000);
});
