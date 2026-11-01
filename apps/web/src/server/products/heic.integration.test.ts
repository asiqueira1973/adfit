import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { assertLocalSupabase } from "@/test/local-db";
import { createAdminClient } from "../db/supabase";
import { businessCodeOf } from "../api/http";
import { convertHeicPhoto } from "./heic";
import { objectPath, photoStoragePath } from "@/lib/storage-paths";

/** Critério 8.3: HEIC convertido para JPG no servidor (arquivo real gerado com `sips`). */
assertLocalSupabase();
const db = createAdminClient();
const sfx = Date.now().toString(36);
let marcaId = "";
let fotoId = "";
let heicPath = "";

beforeAll(async () => {
  marcaId = (await db.from("marcas").insert({ nome: `Marca heic ${sfx}` }).select("id").single()).data!.id;
  const produtoId = (await db.from("produtos").insert({ marca_id: marcaId, nome: "Top", categoria: "top" }).select("id").single()).data!.id;
  heicPath = photoStoragePath(marcaId, produtoId, `foto-${sfx}.heic`);
  const heic = readFileSync(path.resolve(import.meta.dirname, "../../test/fixtures/peca.heic"));
  const { error } = await db.storage.from("produtos").upload(objectPath(heicPath), heic, { contentType: "image/heic" });
  expect(error).toBeNull();
  fotoId = (await db.from("fotos_produto").insert({ produto_id: produtoId, marca_id: marcaId, storage_path: heicPath, ordem: 1 }).select("id").single()).data!.id;
});

describe("convertHeicPhoto", () => {
  it("não converte foto de outra marca", async () => {
    const err = await convertHeicPhoto(fotoId, { papel: "usuario_marca", marcaId: "00000000-0000-0000-0000-000000000000" }).catch((e) => e);
    expect(businessCodeOf(err)).toBe("foto_inexistente");
  });

  it("gera JPG, atualiza o caminho e apaga o HEIC", async () => {
    const newPath = await convertHeicPhoto(fotoId, { papel: "usuario_marca", marcaId });
    expect(newPath).toBe(heicPath.replace(/\.heic$/, ".jpg"));
    const { data: row } = await db.from("fotos_produto").select("storage_path").eq("id", fotoId).single();
    expect(row!.storage_path).toBe(newPath);
    const { data: jpg } = await db.storage.from("produtos").download(objectPath(newPath));
    expect(Buffer.from(await jpg!.arrayBuffer()).subarray(0, 3).toString("hex")).toBe("ffd8ff");
    const { data: old } = await db.storage.from("produtos").download(objectPath(heicPath));
    expect(old).toBeNull();
  });

  it("é idempotente (foto já em JPG não muda)", async () => {
    expect(await convertHeicPhoto(fotoId, { papel: "usuario_marca", marcaId })).toMatch(/\.jpg$/);
  });
});
