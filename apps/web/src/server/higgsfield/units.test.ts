import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildImageBody } from "./models";
import { normalizeResult } from "./types";
import { safeEqual, verifySignature } from "./webhook";

/** Peças puras da integração com a Higgsfield (seções 4.3 e 20; MD-4). */
describe("webhook da Higgsfield", () => {
  const secret = `whsec_${Buffer.from("segredo-de-teste").toString("base64")}`;
  const sign = (id: string, ts: string, body: string) =>
    createHmac("sha256", Buffer.from("segredo-de-teste")).update(`${id}.${ts}.${body}`).digest("base64");

  it("compara token em tempo constante, inclusive com tamanhos diferentes", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("aceita assinatura Standard Webhooks válida e recusa corpo alterado, timestamp velho ou sem cabeçalho", () => {
    const now = 1_800_000_000_000;
    const ts = String(now / 1000);
    const body = '{"request_id":"r","status":"completed"}';
    const headers = new Headers({ "webhook-id": "msg_1", "webhook-timestamp": ts, "webhook-signature": `v1,outra v1,${sign("msg_1", ts, body)}` });
    expect(verifySignature(secret, headers, body, now)).toBe(true);
    expect(verifySignature(secret, headers, body.replace("completed", "failed"), now)).toBe(false);
    expect(verifySignature(secret, headers, body, now + 10 * 60_000)).toBe(false);
    expect(verifySignature(secret, new Headers(), body, now)).toBe(false);
  });

  it("normaliza o envelope do webhook e a resposta do status", () => {
    expect(normalizeResult({ request_id: "r", status: "completed", payload: { images: [{ url: "u" }] } })).toMatchObject({ images: [{ url: "u" }] });
    expect(normalizeResult({ request_id: "r", status: "completed", video: { url: "v" } })).toMatchObject({ video: { url: "v" } });
    expect(normalizeResult({ status: "completed" })).toBeNull();
  });
});

describe("adaptadores de modelo de imagem (MD-4)", () => {
  const req = { prompt: "p", imageUrls: ["a", "b", "c", "d"], aspectRatio: "16:9" as const };

  it("Grok Imagine 2.0 manda as 4 fotos; Qwen corta em 3", () => {
    expect(buildImageBody("xai/grok-imagine-image-2.0", req)).toEqual({ prompt: "p", image_urls: ["a", "b", "c", "d"], aspect_ratio: "16:9", resolution: "2k" });
    expect(buildImageBody("alibaba/qwen-image-3/edit", req).image_urls).toEqual(["a", "b", "c"]);
  });

  it("endpoint sem adaptador e pedido sem referência são recusados", () => {
    expect(() => buildImageBody("a_confirmar", req)).toThrow(/modelo_desconhecido/);
    expect(() => buildImageBody("xai/grok-imagine-image-2.0", { ...req, imageUrls: [] })).toThrow(/sem_referencias/);
  });
});
