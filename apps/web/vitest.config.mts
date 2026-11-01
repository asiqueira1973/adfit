import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "node:path";

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // `server-only` só existe para impedir import no cliente; nos testes de servidor vira módulo vazio.
      "server-only": path.resolve(import.meta.dirname, "src/test/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Variáveis do .env.local (Supabase local) para os testes de integração.
    env: loadEnv(mode, import.meta.dirname, ""),
    // Integração com Supabase local + montagem com ffmpeg: os arquivos disputam CPU; 5 s é pouco.
    testTimeout: 30_000,
    // Os testes de integração compartilham o banco local e os dublês por módulo: um arquivo por vez.
    fileParallelism: false,
  },
}));
