# CLAUDE.md — AdFit

Fonte única de verdade: `docs/spec.md` (v0.2). Planos aprovados: `plans/`. Itens da seção 25 → **pare e pergunte**.

## Regra de ouro
Se um teste falhar, corrija o código, não o teste; nunca pule nem apague teste que falha.
Bug: teste que reproduz → ver falhar → commit → `touch .claude/fix-mode` → corrigir → `rm .claude/fix-mode`.

## Convenções (seção 18)
- Banco em **português snake_case** com os nomes exatos da seção 7/6.4; código, variáveis e arquivos em **inglês**. Fronteira em `apps/web/src/server/db/`.
- Comentário de cabeçalho em português em toda função, rota, hook, trigger e política: o que faz, recebe, devolve e a regra do spec (ex.: `// Implementa a regra 11.2.4`).
- Prompts em `apps/web/src/server/prompts/*.vN.md`; nunca editar versão existente — criar `vN+1` e atualizar `PROMPT_VERSIONS`.
- Migrations em `supabase/migrations/`; nunca editar uma já versionada. Após aplicar: `get_advisors` (security + performance) e atualizar `schema.sql`.
- Segredos só em `apps/web/src/server/` e `apps/worker/`. Nada da seção 28 (fora do escopo).
- Next.js 16 (App Router, Cache Components, `proxy.ts` no lugar de middleware): ler `node_modules/next/dist/docs/` antes de usar API nova.

## Arquitetura (seção 4.4)
`/api/anuncios` debita → Claude (roteiro) → Higgsfield (3 quadros) → webhook → Storage → Claude QC → usuário aprova → `/gerar-video` debita → Higgsfield (3 clipes) → webhook → `montando` → worker ffmpeg → `pronto`.
Compra: `/api/creditos/checkout` → Stripe Checkout → webhook `/api/webhooks/stripe` **e** `/creditos/obrigado` → `fulfillCheckout` → `creditar_pagamento` (idempotente por Checkout Session).

## Comandos (22.1, na raiz)
`npm run typecheck` · `npm run lint` · `npm test` (pgTAP no Supabase local + Vitest) · `npm run build` · `npm run verify` (os quatro).
Saída saudável do verify: termina com a tabela de rotas do `next build` e `worker@… build` sem erro, código 0.

## Idiomas
O app terá pt-BR e inglês (emenda MD-1 em `docs/mudancas-de-escopo.md`); nenhum texto de interface fora de `src/lib/copy.ts` e `src/lib/labels.ts`.

## Pegadinhas
- Nunca exibir prompt, nome de modelo ou custo USD para `usuario_marca`.
- Webhook da Higgsfield chega repetido: tudo idempotente por `request_id`.
- Copiar o resultado da Higgsfield para o Storage antes de marcar `pronto`.
- Débito de crédito sempre antes de submeter; estorno só via `estornar_creditos`.
- Crédito de compra só via `creditar_pagamento`, a partir de `fulfillCheckout`; nunca a partir do redirect sozinho nem de dado vindo do navegador.
- Webhook da Stripe precisa do corpo bruto (sem parse de JSON antes de verificar a assinatura).
- Supabase remoto é o projeto compartilhado "BANCO DE TESTE" (`jeesdmfcrmhyufwzwzwt`): há tabelas de outros apps (`livros_*`, `oc_*`) — não tocar; filtrar advisors para objetos do AdFit.
- `typecheck` do web roda `next typegen` antes do `tsc` (tipos `LayoutProps`/`PageProps` são gerados).
- Supabase local usa as portas **553xx** (API 55321, DB 55322, Mailpit 55324); outro projeto ocupa as 543xx.
- Remoto é compartilhado: migrations via MCP `apply_migration` (mesmo SQL do arquivo), nunca `supabase db push`; Auth/e-mails são do projeto todo.
- Cache Components: leitura de sessão/cookies sempre dentro de `<Suspense>`; `createUserClient()` chama `connection()` (o Supabase usa o relógio).
- Hooks de cliente com `usePathname`/`useSearchParams` precisam de `<Suspense>` (padrão: componente `*View` puro como fallback).
- `/sair` é POST (formulário); nunca `<Link href="/sair">`.
- No `config.toml`, `[auth] enable_signup = false` bloqueia autocadastro; `[auth.email] enable_signup` precisa ficar `true` (senão desliga o login por e-mail). Mudou o config → `supabase stop && supabase start`.
- Colunas técnicas (`anuncios.roteiro`, `cenas.prompt_*`, `quadros.qc_detalhe`…) não têm GRANT para o cliente: nunca `select("*")` nessas tabelas com o cliente do usuário; liste as colunas (D-10).
- Service role ignora RLS e políticas de Storage: antes de assinar/baixar/gravar um caminho vindo do banco, confira que ele está na pasta da marca dona (prefixo). Caminhos têm CHECK no banco.
- Testes de banco nunca contam a tabela inteira: filtre pelos dados da fixture (o banco local acumula dados de outros testes).
- Zod 4: `.default()` continua valendo dentro de `.partial()`; schema de PATCH não pode herdar padrões do POST.
- Stripe: só chaves `sk_test_` no `.env.local`; Prices precisam ser avulsos (One-off) — recorrente quebra `mode=payment`; `SEED_STRIPE_PRICE_*` recebe `price_…`, não `prod_…`.
- Botões cobrados (`CostButton`) leem saldo e pausa reais do `BrandStatusProvider` da casca; não passar saldo de fixture achando que vale.
- Erros de negócio do banco sobem com MESSAGE = código (`saldo_insuficiente`…); o servidor traduz.
- Não chamar função volátil (ex.: `debitar_creditos`) dentro de WHERE em teste: roda uma vez por linha.
- Higgsfield API: saldo pré-pago próprio (separado do conector MCP); `403 not_enough_credits` = recarregar no console. `HF_API_KEY_ID`/`HF_API_KEY_SECRET` são as duas metades do par `id:secret`.
- `configuracoes.valor` é jsonb: grave a string pura (`"modelo"`), nunca `JSON.stringify(...)` antes do supabase-js (vira string com aspas dentro).
- Prompts `.md` são lidos do disco em tempo de execução (`loadPrompt`); `next.config.ts` os inclui no trace com `outputFileTracingIncludes`.
- Gerações: nunca grave URL assinada em `geracoes.entrada` (expira e vaza); grave os caminhos e assine na submissão.
- Analytics (MD-8): use `track()` de `src/server/analytics/track.ts` nos pontos-chave novos (vídeo gerado, download…); nunca bloqueia, nunca manda prompt/URL assinada; `distinct_id` = e-mail.
- Foto de entrada: sempre `toJpeg()` pelo conteúdo antes de mandar a modelo de IA (já houve `.jpg` que era HEIF).
- Quando o agente errar a mesma coisa duas vezes, a correção entra aqui.
