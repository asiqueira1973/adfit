import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildClipPrompt } from "../ads/clips";
import { buildVideoBody } from "../higgsfield/models";
import { assembleVideo, ffmpegPath } from "./assemble";

/**
 * Emenda MD-11 (01/11/2026, pedido do Alexandre): o vídeo leva o som ambiente gerado pelo Seedance
 * (passos, respiração, ambiente) — sem música, voz ou narração; o lojista decide se põe música no Reels.
 */
const dir = mkdtempSync(join(tmpdir(), "adfit-audio-"));

function clipWithAudio(name: string): string {
  const out = join(dir, name);
  execFileSync(ffmpegPath(), ["-y", "-f", "lavfi", "-i", "testsrc=size=720x1280:rate=24:duration=5.2", "-f", "lavfi", "-i", "sine=frequency=440:duration=5.2", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", out], { stdio: "ignore" });
  return out;
}

function clipSilent(name: string): string {
  const out = join(dir, name);
  execFileSync(ffmpegPath(), ["-y", "-f", "lavfi", "-i", "testsrc=size=720x1280:rate=24:duration=5.2", "-pix_fmt", "yuv420p", out], { stdio: "ignore" });
  return out;
}

function meanVolume(file: string, from: number, to: number): number {
  const r = spawnSync(ffmpegPath(), ["-ss", String(from), "-to", String(to), "-i", file, "-af", "volumedetect", "-vn", "-f", "null", "-"], { encoding: "utf8" });
  const m = `${r.stdout}${r.stderr}`.match(/mean_volume: (-?[\d.]+|-inf) dB/);
  return m && m[1] !== "-inf" ? Number(m[1]) : -999;
}

describe("som ambiente (MD-11)", () => {
  it("Seedance gera o áudio do clipe", () => {
    expect(buildVideoBody("bytedance/seedance-2.5/image-to-video", { prompt: "p", imageUrl: "u", seconds: 5 })).toMatchObject({ generate_audio: true });
  });

  it("o prompt do clipe pede só som ambiente: sem música, voz ou narração", () => {
    const p = buildClipPrompt("she runs");
    expect(p).toMatch(/ambient sound only/i);
    expect(p).toMatch(/no music/i);
    expect(p).toMatch(/no (speech|voice)/i);
  });

  it("a montagem mantém o som dos clipes (com clipe mudo no meio)", async () => {
    const out = join(dir, "amb.mp4");
    await assembleVideo({
      clips: [clipWithAudio("a1.mp4"), clipSilent("a2.mp4"), clipWithAudio("a3.mp4")],
      out,
      formato: "vertical_9_16",
      textos: [null, null, null],
      logoPng: null,
      marca: "Marca",
      cta: "Compre",
      cor: null,
      oferta: null,
    });
    expect(meanVolume(out, 1, 4)).toBeGreaterThan(-40);
    expect(meanVolume(out, 6, 9)).toBeLessThan(-80);
    expect(meanVolume(out, 11, 13)).toBeGreaterThan(-40);
  }, 120_000);

  it("estalo no começo do clipe (relato de 01/11/2026, cena 1 da orla) sai abafado; o ambiente continua", async () => {
    // Clipe com ruído baixo (ambiente) e um estalo forte entre 0,3 s e 0,4 s.
    const pop = join(dir, "pop.mp4");
    execFileSync(ffmpegPath(), ["-y", "-f", "lavfi", "-i", "testsrc=size=720x1280:rate=24:duration=5.2", "-f", "lavfi", "-i", "anoisesrc=d=5.2:a=0.01:c=pink,volume='if(between(t,0.3,0.4),60,1)':eval=frame", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", pop], { stdio: "ignore" });
    const out = join(dir, "pop-out.mp4");
    await assembleVideo({ clips: [pop, clipWithAudio("p2.mp4"), clipWithAudio("p3.mp4")], out, formato: "vertical_9_16", textos: [null, null, null], logoPng: null, marca: "M", cta: null, cor: null, oferta: null });
    const peak = (f: string, from: number, to: number) => {
      const r = spawnSync(ffmpegPath(), ["-ss", String(from), "-to", String(to), "-i", f, "-af", "volumedetect", "-vn", "-f", "null", "-"], { encoding: "utf8" });
      return Number(`${r.stdout}${r.stderr}`.match(/max_volume: (-?[\d.]+) dB/)?.[1] ?? "0");
    };
    // O estalo cai pelo menos 15 dB em relação ao clipe original.
    expect(peak(pop, 0, 1) - peak(out, 0, 1)).toBeGreaterThanOrEqual(15);
    // O som ambiente depois do começo continua presente.
    expect(meanVolume(out, 2, 4)).toBeGreaterThan(-60);
  }, 120_000);
});
