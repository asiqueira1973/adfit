import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentProfile = vi.fn();
vi.mock("../auth/profile", () => ({ getCurrentProfile: () => getCurrentProfile() }));
const { requireAdminApi, isResponse } = await import("./guards");

const base = { id: "u1", nome: "X", email: "x@x.dev", marcaId: null, idioma: "pt_br" as const };

/** Seção 13: "Toda rota de admin confere eh_admin() no servidor; esconder o menu não é permissão." */
describe("requireAdminApi", () => {
  beforeEach(() => getCurrentProfile.mockReset());

  it("401 sem sessão", async () => {
    getCurrentProfile.mockResolvedValue(null);
    const r = await requireAdminApi();
    expect(isResponse(r) && r.status).toBe(401);
  });
  it("403 para usuario_marca", async () => {
    getCurrentProfile.mockResolvedValue({ ...base, papel: "usuario_marca", marcaId: "m1", ativo: true });
    const r = await requireAdminApi();
    expect(isResponse(r) && r.status).toBe(403);
    expect(isResponse(r) && (await r.json())).toEqual({ erro: "nao_autorizado", mensagem: "Você não tem permissão para isso." });
  });
  it("403 para admin desativado", async () => {
    getCurrentProfile.mockResolvedValue({ ...base, papel: "admin_plataforma", ativo: false });
    expect(isResponse(await requireAdminApi())).toBe(true);
  });
  it("libera admin ativo", async () => {
    getCurrentProfile.mockResolvedValue({ ...base, papel: "admin_plataforma", ativo: true });
    const r = await requireAdminApi();
    expect(isResponse(r)).toBe(false);
  });
});
