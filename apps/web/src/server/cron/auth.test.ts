import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { cronAuthorized } from "./auth";

describe("cronAuthorized", () => {
  const secret = "s".repeat(32);
  it("aceita o Bearer certo", () => expect(cronAuthorized(`Bearer ${secret}`, secret)).toBe(true));
  it("recusa segredo errado, ausente ou sem Bearer", () => {
    expect(cronAuthorized(`Bearer ${"x".repeat(32)}`, secret)).toBe(false);
    expect(cronAuthorized(null, secret)).toBe(false);
    expect(cronAuthorized(secret, secret)).toBe(false);
  });
  it("recusa tudo se o segredo não estiver configurado", () => {
    expect(cronAuthorized("Bearer ", undefined)).toBe(false);
    expect(cronAuthorized("Bearer abc", "abc")).toBe(false);
  });
});
