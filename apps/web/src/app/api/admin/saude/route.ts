import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { NextResponse } from "next/server";
import { isResponse, requireAdminApi } from "@/server/api/guards";
import { ffmpegPath, fontPath } from "@/server/video/assemble";

/**
 * GET /api/admin/saude — verificação operacional (D-23): o ffmpeg e a fonte da montagem estão no
 * pacote da função? Quem: admin. Devolve: { ffmpeg: versão | erro, fonte: boolean }.
 */
export async function GET() {
  const profile = await requireAdminApi();
  if (isResponse(profile)) return profile;
  let ffmpeg: string;
  try {
    ffmpeg = execFileSync(ffmpegPath(), ["-version"], { encoding: "utf8" }).split("\n")[0];
  } catch (e) {
    ffmpeg = `erro: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}`;
  }
  return NextResponse.json({ ffmpeg, fonte: existsSync(fontPath()) });
}
