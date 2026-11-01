# AdFit (nome provisório)

Plataforma de anúncios em vídeo com IA para marcas de roupa fitness. Spec: [`docs/spec.md`](docs/spec.md). Planos por épico: [`plans/`](plans/).

## Estrutura
- `apps/web` — Next.js 16 (App Router) + Supabase; deploy na Vercel (Root Directory `apps/web`).
- `apps/worker` — montagem do vídeo com ffmpeg (container).
- `supabase/` — migrations, seed e testes pgTAP.
- `scripts/` — seed do admin e utilitários.

## Setup local
1. Node 22+, Docker (para o Supabase local), Supabase CLI, `jq` (guardrails em `.claude/hooks`).
2. `npm install` na raiz.
3. `cp .env.example apps/web/.env.local` e preencher (ver tabela de variáveis na seção 18 do spec).
4. `supabase start` e `npm run dev` → http://localhost:3000.

## Verificação
`npm run verify` roda typecheck, lint, testes (banco + Vitest) e build; termina com erro se qualquer um falhar.

## Deploy
- Web: `vercel deploy --prod` (projeto `adfit`, produção em https://adfit-roan.vercel.app).
- Migrations: `supabase db push` no projeto remoto; depois rodar os advisors.

_Seções sobre worker, webhook local da Higgsfield (túnel) e `stripe listen` entram nos épicos 8.6 e 8.9._
