import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { brandKitSchema } from "@/lib/schemas/brand";
import { assembleVideo, ffmpegPath, ffprobeInfo } from "./assemble";

/** Emenda MD-13 (01/11/2026, pedido do Alexandre): a chamada final (CTA) da marca é opcional. */
const dir = mkdtempSync(join(tmpdir(), "adfit-cta-"));
function clip(name: string): string {
  const out = join(dir, name);
  execFileSync(ffmpegPath(), ["-y", "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=24:duration=5.2", "-pix_fmt", "yuv420p", out], { stdio: "ignore" });
  return out;
}

describe("chamada final opcional (MD-13)", () => {
  it("o kit aceita CTA vazio e grava null", () => {
    const r = brandKitSchema.safeParse({ nome: "Marca", cta_padrao: "  " });
    expect(r.success).toBe(true);
    expect(r.success && r.data.cta_padrao).toBeNull();
    expect(brandKitSchema.safeParse({ nome: "Marca", cta_padrao: "x".repeat(41) }).success).toBe(false);
  });

  it("sem CTA, o fecho tem só o nome/logo (uma imagem a menos) e o vídeo segue com 15 s", async () => {
    let withCta = "";
    let without = "";
    const base = { formato: "horizontal_16_9" as const, textos: [null, null, null] as [null, null, null], logoPng: null, marca: "Marca", cor: null, oferta: null };
    await assembleVideo({ ...base, clips: [clip("a.mp4"), clip("b.mp4"), clip("c.mp4")], out: join(dir, "com.mp4"), cta: "Compre", onCommand: (a) => (withCta = a.join(" ")) });
    const out = join(dir, "sem.mp4");
    await assembleVideo({ ...base, clips: [clip("d.mp4"), clip("e.mp4"), clip("f.mp4")], out, cta: null, onCommand: (a) => (without = a.join(" ")) });
    const pngs = (s: string) => (s.match(/txt\d+\.png/g) ?? []).length;
    expect(pngs(without)).toBe(pngs(withCta) - 1);
    expect(Math.abs(ffprobeInfo(out).duration - 15)).toBeLessThanOrEqual(0.2);
  }, 120_000);
});
