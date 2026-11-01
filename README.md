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
- Migrations: no remoto compartilhado, pelo MCP `apply_migration` com o mesmo SQL do arquivo (nunca `supabase db push`); depois rodar os advisors.

## Pagamentos (Stripe, modo de teste)
1. Chaves de TESTE no `apps/web/.env.local`: `STRIPE_SECRET_KEY=sk_test_…`, `SEED_STRIPE_PRICE_PACOTE_60/150=price_…` (Prices **avulsos/One-off** em USD) e `npm run seed:admin` para criar os pacotes.
2. `stripe login` (sandbox) e `stripe listen --print-secret` → `STRIPE_WEBHOOK_SECRET=whsec_…` no `.env.local`.
3. `stripe listen --forward-to localhost:<porta>/api/webhooks/stripe` com o app rodando e `APP_URL` apontando para a mesma porta.
4. Comprar em Créditos → Comprar créditos com o cartão `4242 4242 4242 4242`, validade futura, qualquer CVC.
5. Reenvio de evento: `stripe events resend <evt_…>`; reembolso: painel da Stripe ou `POST /v1/refunds`.
Produção: chaves live e o endpoint `https://<app>/api/webhooks/stripe` (eventos da seção 4.5) só na Vercel, nunca no `.env.local`.

## Geração (Higgsfield e Claude)
- `apps/web/.env.local`: `HF_API_KEY_ID` e `HF_API_KEY_SECRET` (console da Higgsfield API — são os dois lados do par `id:secret`), `HF_WEBHOOK_TOKEN` (aleatório, ≥ 16 caracteres), `HF_WEBHOOK_SECRET=whsec_…` (opcional, Settings do console) e `ANTHROPIC_API_KEY`.
- A API da Higgsfield tem **saldo pré-pago próprio** (console → Billing), separado do plano/assinatura do site ou do conector MCP. Sem saldo, toda submissão volta `403 not_enough_credits` e a ficha falha com estorno.
- Localmente não há webhook (o `APP_URL` é http): o resultado chega pelo polling da tela (reconsulta a cada 30 s depois de 3 min) ou pelo "Reconsultar" do admin.
- Modelos e preços ficam em `configuracoes` (`modelo_imagem`, `modelo_video`, `preco_usd_*`): trocar sem deploy. Valores jsonb são strings simples (`"xai/grok-imagine-image-2.0"`), nunca `JSON.stringify` de novo.

_A seção sobre o worker entra no épico 8.6._

## Login e convites (MD-7)
- Em produção o login é só com Google. Variáveis: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (web) e o provedor Google ligado no Supabase com o mesmo client ID. As origens JavaScript autorizadas no Google Cloud precisam incluir cada domínio do app.
- Localmente, a tela Entrar mostra também "Entrada de desenvolvimento" (e-mail e senha), usada pelos testes e capturas.
- E-mail de boas-vindas do convite: `RESEND_API_KEY` e `MAIL_FROM` (ex.: `AdFit <ola@adfit.com.br>`, com o domínio verificado no Resend). Sem elas, o admin recebe o link para mandar manualmente.
