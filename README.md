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
3. `supabase start` (portas 553xx: API http://127.0.0.1:55321, Mailpit http://127.0.0.1:55324 para ver e-mails de convite).
4. `cp .env.example apps/web/.env.local` e preencher com `supabase status -o env` (URL, ANON_KEY, SERVICE_ROLE_KEY, DB_URL→DATABASE_URL), `APP_URL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_SENHA`.
5. `npm run seed:admin` (admin local; pacotes só com `SEED_STRIPE_PRICE_*`).
6. `npm run dev` → http://localhost:3000.

## Banco
- Migrations: `supabase/migrations/` (nunca editar uma versionada; criar nova). Local: `supabase migration up --local`.
- Remoto (projeto compartilhado "BANCO DE TESTE"): aplicar o mesmo SQL com `apply_migration` do MCP do Supabase e rodar os advisors (security e performance). Não usar `supabase db push`.
- Tipos: `npm run db:types`. Schema: `supabase db dump --local --schema public -f schema.sql`.
- Admin remoto: `npx tsx --env-file=<arquivo com as variáveis do remoto> scripts/seed-admin.ts`.

## Verificação
`npm run verify` roda typecheck, lint, testes (banco + Vitest) e build; termina com erro se qualquer um falhar.

## Deploy
- Web: `vercel deploy --prod` (projeto `adfit`, produção em https://adfit-roan.vercel.app).
- Migrations: `supabase db push` no projeto remoto; depois rodar os advisors.

_Seções sobre worker, webhook local da Higgsfield (túnel) e `stripe listen` entram nos épicos 8.6 e 8.9._
