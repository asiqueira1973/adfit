import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assembleVideo, ffmpegPath } from "./assemble";

/**
 * Emenda MD-14 (01/11/2026, regra pedida pelo Alexandre): o fecho nunca cobre a peça. De 12,5 s a 15 s
 * a cena fica desfocada e mais escura (cartela final) e o logo/nome, a chamada e a oferta entram por cima.
 */
const dir = mkdtempSync(join(tmpdir(), "adfit-fecho-"));
function clip(name: string): string {
  const out = join(dir, name);
  execFileSync(ffmpegPath(), ["-y", "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=24:duration=5.2", "-pix_fmt", "yuv420p", out], { stdio: "ignore" });
  return out;
}
/** Energia de bordas de um quadro (quadro nítido = valor alto; desfocado = baixo). */
function edges(video: string, at: number): number {
  const r = spawnSync(ffmpegPath(), ["-ss", String(at), "-i", video, "-frames:v", "1", "-vf", "edgedetect,signalstats,metadata=print:key=lavfi.signalstats.YAVG", "-f", "null", "-"], { encoding: "utf8" });
  return Number(`${r.stdout}${r.stderr}`.match(/YAVG=([\d.]+)/)?.[1] ?? "0");
}

describe("fecho como cartela (MD-14)", () => {
  it("a cena 3 fica nítida antes do fecho e desfocada durante o fecho", async () => {
    const out = join(dir, "fecho.mp4");
    await assembleVideo({ clips: [clip("a.mp4"), clip("b.mp4"), clip("c.mp4")], out, formato: "horizontal_16_9", textos: [null, null, null], logoPng: null, marca: "Marca", cta: null, cor: null, oferta: null });
    // Mede longe do centro (onde entra o nome) para ver só o fundo.
    const sharp = edges(out, 11);
    const blurred = edges(out, 14.2);
    expect(blurred).toBeLessThan(sharp * 0.5);
  }, 120_000);

  it("sem fecho (opção do anúncio): nenhuma cartela, logo, CTA ou oferta; vídeo segue com 15 s", async () => {
    let graph = "";
    const out = join(dir, "sem-fecho.mp4");
    await assembleVideo({ clips: [clip("d.mp4"), clip("e.mp4"), clip("f.mp4")], out, formato: "horizontal_16_9", textos: [null, null, null], logoPng: null, marca: "Marca", cta: "Compre", cor: null, oferta: "10% OFF", fecho: false, onCommand: (a) => (graph = a.join(" ")) });
    expect(graph).not.toContain("boxblur");
    expect(graph).not.toMatch(/txt\d+\.png/);
    expect(edges(out, 14.2)).toBeGreaterThan(edges(out, 11) * 0.7);
  }, 120_000);
});
