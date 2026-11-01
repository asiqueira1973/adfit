import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Sem o selo do modo dev: ele cobre a barra inferior nas capturas de tela (seção 22.1).
  devIndicators: false,
  partialPrefetching: true,
  // Prompts versionados (Anexo C) são lidos do disco em tempo de execução: entram no trace das funções.
  // Montagem do vídeo na Vercel (D-23): binário do ffmpeg-static (instalado na raiz do monorepo) e a fonte Inter Bold.
  outputFileTracingIncludes: {
    "/**": ["./src/server/prompts/*.md"],
    "/api/**": ["./src/server/video/assets/*.ttf", "../../node_modules/ffmpeg-static/ffmpeg"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
