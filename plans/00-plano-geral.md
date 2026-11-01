# AdFit v0.2 — Plano de implementação por épico

## Contexto
Repositório vazio (`/Users/alexandresiqueira/adfit`) contendo só `spec.md` v0.2 (fonte única de verdade), `modelo-adfit.dbml` e `prompt-design-adfit.md` — já copiados para `docs/`. Objetivo: implementar o MVP/piloto Kore Active seguindo a seção 8 na ordem **8.0 → [Design] → 8.1 → 8.2 → 8.9 → 8.3 → 8.4 → 8.5 → 8.6 → 8.7 → 8.8**, com guardrails do Anexo B, verificação por épico (`npm run verify` + subagente `verifier` + revisão contra `REVIEW.md`/`plans/`) e nada da seção 28.

Decisões já tomadas com você:
- **Supabase:** projeto existente **"BANCO DE TESTE"** (`jeesdmfcrmhyufwzwzwt`, us-east-2). É compartilhado (tabelas `livros_*`, `oc_*`); não há colisão de nomes com as tabelas do AdFit. Consequências: (a) região não é São Paulo → registrar como divergência da seção 20 em `DOCUMENTACAO-TECNICA.md`; (b) o `auth.users` é compartilhado — usuários de outros apps não têm linha em `perfis`, então `eh_admin()`/`minha_marca_id()` devolvem falso/nulo para eles e a RLS os bloqueia; o middleware também recusa login sem `perfis`; (c) advisors serão filtrados para objetos do AdFit; (d) antes da 1ª migration confiro colisão de nomes de funções (`eh_admin`, `definir_atualizado_em`…) e buckets (`marcas`, `produtos`, `anuncios`). Desenvolvimento e testes rodam no **Supabase local (Docker, já ativo)**; o remoto recebe as migrations via `supabase db push`/`apply_migration`.
- **Design:** direto em Next.js com dados fictícios, capturas 390 px (+1280 px admin), claro e escuro, aprovação antes de ligar aos dados.
- **Deploy:** repositório privado `asiqueira1973/adfit` + projeto Vercel via CLIs já logados.
- Conector da **Higgsfield (MCP) está disponível** (saldo 105,9 créditos, plano plus) → gero as imagens da 16.3 com ele.

## Convenções transversais (valem para todos os épicos)
- Monorepo npm workspaces: `apps/web` (Next.js App Router + TS + Tailwind, Lucide), `apps/worker` (Node + ffmpeg, Dockerfile), `supabase/`, `scripts/`, `plans/`, `docs/`.
- Banco em português snake_case com os nomes **exatos** da seção 7/6.4; código em inglês; fronteira em `apps/web/src/server/db/`.
- Comentário de cabeçalho em português em toda função, rota, hook, trigger e política (o que faz, recebe, devolve, seção do spec).
- Zod em toda rota; erros `{ erro, mensagem }` com copy da seção 15.
- Constante `APP_NAME = "AdFit"` (A-1).
- Bug: teste que falha primeiro → commit → `touch .claude/fix-mode` → corrigir código → `rm .claude/fix-mode`.
- Ao fim de cada épico: `npm run verify` (colar saída) → subagente `verifier` (só avança com tudo "cumprido") → revisar diff contra `REVIEW.md` e `plans/<epico>.md` → atualizar `CLAUDE.md`/`README.md`/`DOCUMENTACAO-TECNICA.md` no mesmo commit.
- Após aprovação deste plano: salvo cada épico em `plans/<epico>.md` (`8.0-guardrails.md`, `design.md`, `8.1-banco-auth.md`, …) e commito; atualizo no mesmo commit quando a implementação divergir.

## Paradas obrigatórias (seção 25 — pergunto, não assumo)
| Quando | O que pergunto |
|---|---|
| Antes do 8.9 | **25.1** moeda/preço dos pacotes e cortesia; **25.6** conta Stripe (entidade, país, moeda de repasse); chaves de teste `sk_test_`/`whsec_` e os 2 Price IDs de teste; autorização para `brew install stripe/stripe-cli/stripe` |
| Antes do 8.4 | **25.5** endpoint IDs e preços da Higgsfield API (vou ler `docs.higgsfield.ai/docs/llms.txt` e trazer proposta para confirmação); `HF_API_KEY_ID/SECRET` da API (diferente do conector MCP) |
| Antes do 8.5 | `ANTHROPIC_API_KEY`; o spec cita `claude-sonnet-5-5`, que não consta dos modelos que conheço (Sonnet 5 = `claude-sonnet-5`) → confirmo o ID correto com você (fica em `configuracoes`, sem deploy) |
| Antes do 8.6 | Host do worker (Railway ou Fly.io — nenhum CLI instalado) |
| Antes do 8.7 | `brew install ffmpeg` para teste local (ou rodar os testes do worker dentro do container) |

---

## Épico 8.0 — Guardrails e esqueleto
1. `git init`, `.gitignore` (node_modules, .env*, `.next`, `.claude/fix-mode`), commit inicial com `docs/`.
2. Criar arquivos do Anexo B **literalmente**: `.claude/settings.json`, `.claude/hooks/{guard-secrets,guard-migrations,guard-prompts,guard-tests,remind-advisors}.sh`, `.claude/agents/verifier.md`, `REVIEW.md`; `chmod +x`.
3. Testar cada hook provocando a violação uma vez (via `echo '<json>' | CLAUDE_PROJECT_DIR=… hook.sh; echo $?`) e também uma edição real bloqueada; colar saídas:
   - secrets: `NEXT_PUBLIC_STRIPE_SECRET_KEY` e `SUPABASE_SERVICE_ROLE_KEY` em `apps/web/src/features/x.ts` → exit 2;
   - migrations: editar migration já versionada (fixture commitada) → exit 2;
   - prompts: editar `prompts/x.v1.md` versionado → exit 2;
   - tests: com `.claude/fix-mode`, editar `*.test.ts` → exit 2;
   - advisors: escrever em `supabase/migrations/` → mensagem + exit 2.
4. Esqueleto: `apps/web` (create-next-app, Tailwind, tokens 16.2 em CSS vars claro/escuro, Inter via `next/font`), `apps/worker` (TS, Vitest), `supabase init`, Vitest, ESLint, scripts raiz `typecheck`, `lint`, `test`, `build`, `verify`.
5. Página `/entrar` placeholder respondendo 200; `gh repo create asiqueira1973/adfit --private`, push; `vercel link` + deploy; `curl -I` no `/entrar` = 200.
6. `CLAUDE.md` (1 página: convenções 18, mapa 4.4, comandos 22.1 com saída saudável, pegadinhas e regra de ouro) e `README.md` iniciais.
**Aceite:** checkboxes da 8.0.

## Fase de Design (antes de qualquer tela ligada a dados)
1. Gerar imagens 16.3 com o conector Higgsfield (3 fotos + 6 cenários + 6 modalidades = 15), sem logos de terceiros; salvar em `apps/web/public/images/`. Se alguma falhar → placeholder marcado e aviso.
2. Componentes base em `components/ui/` (Button com custo no rótulo/“Saldo insuficiente”, Card, ListGroup, Badge de status, Segmented, Field com contador, BottomTabBar, TopBar com saldo, AdminSidebar estilo App Store Connect 16.4).
3. Todas as telas do briefing (1–17, 10a, 10b) em rotas reais, alimentadas por fixtures em `src/features/*/fixtures.ts` (trocadas por dados no épico correspondente), com todos os estados pedidos (vazio, gerando, falha, aviso QC, pronto, pausada, desativado, cancelada…), via `?estado=`.
4. Capturar no navegador interno: marca em 390 px, admin em 390 e 1280 px, claro e escuro → mostrar para aprovação. **Paro aqui até você aprovar.**
5. Aprovado: salvar capturas em `docs/design/<tela>-<largura>-<tema>.png`, commit, usar na verificação visual de cada épico (22.1).

## Épico 8.1 — Banco, autenticação e permissões
1. Migrations (timestamp) em ordem: enums 7.2 → tabelas 7.3 (todos checks/uniques/defaults, `perfis_marca_obrigatoria_chk`, FKs circulares `produtos.ficha_aprovada_id`, `cenas.quadro_atual_id/clipe_atual_id` adicionadas após as tabelas) → funções 7.5 (`eh_admin`, `minha_marca_id`, `debitar_creditos`, `estornar_creditos`, `lancar_creditos`, `creditar_pagamento`, `estornar_pagamento`, `pegar_proximo_anuncio_para_montar`, `definir_atualizado_em`) com `revoke execute … from public, anon, authenticated` e grant só a `service_role` onde o spec manda → triggers 7.5 → RLS + políticas 6.4 com os nomes exatos (`marcas_update_kit` restringe colunas via `grant update(col…)` + política) → buckets privados e políticas de Storage → índices nas FKs.
2. Aplicar local e no remoto; **após cada migration rodar `get_advisors` security + performance**, corrigir críticos, `supabase db dump --schema public` → `schema.sql` (filtrado aos objetos do AdFit).
3. `supabase/seed.sql` (preços 11.1, configurações 11.6, pacotes 11.2.9 com price IDs das env, marca Kore Active) + `scripts/seed-admin.ts`.
4. Testes pgTAP em `supabase/tests/`: RLS marca A × B **um teste por tabela**; update de `saldo_creditos` por `usuario_marca` falha; update/delete em `movimentacoes_creditos` falham; `debitar_creditos` (insuficiente, inativa, preço zero, concorrência), `estornar_creditos` idempotente, soma = saldo, limite de 4 fotos.
5. Auth: clientes Supabase (browser/server/admin em `src/server/db/`), middleware (sessão, `perfis.ativo`, sem perfil = recusa, roteia admin/marca), `/entrar`, `/definir-senha`, `/redefinir-senha`, "Esqueci minha senha", tela de acesso desativado; tipos gerados.
**Aceite:** checkboxes 8.1 (incluindo advisors sem crítico).

## Épico 8.2 — Painel admin: marcas, usuários e créditos
Rotas `POST /api/admin/marcas`, `POST /api/admin/usuarios` (`inviteUserByEmail` + perfil), `PATCH /api/admin/usuarios/:id`, `POST /api/admin/creditos` (→ `lancar_creditos`), pausar marca; todas checam `eh_admin()` no servidor. Telas Marcas, Marca (abas Kit/Usuários/Extrato/Pagamentos/Anúncios, modal Lançar créditos com mensagens 15), Usuários, ligadas aos dados. Bloqueio de ações cobradas com marca pausada (helper reutilizado nos épicos seguintes). Testes Vitest das rotas + teste "100 créditos → saldo 100, `saldo_apos = 100`" e ajuste negativo recusado.

## Épico 8.9 — Compra de créditos com Stripe (após respostas 25.1/25.6)
`src/server/stripe/`: cliente, `createCheckout`, `fulfillCheckout(sessionId)` (retrieve com `line_items`, confere `paid`, chama `creditar_pagamento`), handler do webhook com corpo bruto + `constructEvent` (5 eventos da 4.5), `estornar_pagamento` em `charge.refunded`. Rotas `POST /api/creditos/checkout`, `POST /api/webhooks/stripe`, página `/creditos/obrigado`, telas Créditos/Comprar créditos, `[Admin] Configurações` (pacotes, validando Price na Stripe) e aba Pagamentos. Testes: assinatura inválida = 400 sem efeito; `unpaid` não credita; `fulfillCheckout` 3× (sequencial + `Promise.all`) = 1 crédito; expirado/falhou sem crédito; refund limitado ao saldo. Manual: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` + cartão 4242, reenvio do evento e recarga da página de obrigado; colar saídas.

## Épico 8.3 — Kit da marca e produtos
Tela Marca (upload logo PNG/SVG/JPG ≤5 MB no Storage `marcas/<id>/logo/`, cor, CTA ≤40, tom, prévia do fecho), Produtos (grade, filtro, arquivar, selos), Novo produto (1–4 fotos JPG/PNG/HEIC/WEBP ≤10 MB, progresso, conversão HEIC→JPG no servidor com `sharp`/`heic-convert`), estados vazio/carregando/erro com copy 15. Testes: 5ª foto bloqueada, validações de arquivo.

## Épico 8.4 — Ficha de produto (após 25.5)
`src/server/higgsfield/` (cliente atrás de interface, submissão com `hf_webhook`, webhook idempotente por `request_id` com token em tempo constante, cópia do resultado para Storage antes de `pronto`, polling de reserva 30 s/3 min, timeout 15 min, limite 10 simultâneas, custo USD), prompt `ficha.v1.md` + `refacao.v1.md` (modo ficha) + `PROMPT_VERSIONS`. Rotas `POST /api/produtos/:id/ficha`, `POST /api/fichas/:id/aprovar`, `POST /api/admin/geracoes/:id/reconsultar`. Retentativa automática sem cobrança, estorno na falha definitiva. Realtime + polling 5 s. Testes com dublês gravados. Um teste manual real; testar 2 modelos de imagem (risco da seção 23).

## Épico 8.5 — Criar anúncio: roteiro e quadros
`src/server/claude/` (tool use, schemas Zod do Anexo C.2/C.4/C.6, 2 tentativas), todos os prompts do Anexo C como `apps/web/src/server/prompts/*.v1.md` (texto literal; nunca editados depois), cláusulas fixas concatenadas pelo código, QC com aprovação calculada no código (11.5), regex de termos proibidos (20). Assistente 4 passos + resumo com padrões 8.5; `POST /api/anuncios`; máquina de estados 12.2 centralizada em `src/server/ads/stateMachine.ts` com testes (cada transição permitida + proibidas); edição de `texto_tela` com limites 11.7.

## Épico 8.6 — Refação de quadro e geração do vídeo
Rotas `refazer-quadro`, `usar-quadro`, `gerar-video` (débito único, 3 clipes 5 s), `refazer-clipe`; estorno proporcional `floor(12/3)=4` por cena (11.2.4) com teste; falha de cena → `aguardando_aprovacao` + "Tentar de novo · 4 créditos". Worker: loop com `pegar_proximo_anuncio_para_montar`, até 3 tentativas, Dockerfile com ffmpeg + Inter Bold, deploy no host escolhido.

## Épico 8.7 — Montagem, ajustes e download
ffmpeg conforme 11.8 (corte seco, áreas seguras, fades, fecho 12,5–15 s, escurecimento 40%, logo 40%/20%, CTA na cor de destaque, AAC silencioso, H.264 High 30 fps CRF 20 faststart). `PATCH /api/anuncios/:id/textos`, `usar-clipe` (remontagem grátis, `versao_montagem++`), `GET /api/anuncios/:id/download` com nome da regra 8.7. Teste do worker com `testsrc`: 15 s ±0,2, resolução, faixa de áudio, frame do fecho diferente.

## Épico 8.8 — Créditos do usuário, histórico e custos
Saldo no topo de todas as telas da marca, extrato com links, biblioteca com filtros, `[Admin] Custos` (por marca/mês, USD/BRL, receita, margem, 4 métricas da 21) + CSV da seção 14 (BOM, `;`, vírgula decimal), `[Admin] Gerações` filtrável com detalhe. Fechamento: `DOCUMENTACAO-TECNICA.md` (itens 1–7 da seção 19, incluindo pipelines de geração e pagamento e divergências), `CLAUDE.md` e `README.md` finais, checklist da seção 26.

## Fora do escopo (seção 28) — não implementar
Fala para câmera, narração, trilha, 30 s, Pix, assinatura mensal, autocadastro, notificações externas, 4:5/1:1, publicação no Instagram.

## Verificação
- Por épico: `npm run verify` (typecheck web+worker, lint, Vitest + `supabase test db` no local, build) com saída colada; subagente `verifier`; diff × `REVIEW.md` × `plans/`.
- Banco: `get_advisors` (security/performance) após cada migration; pgTAP de RLS por tabela.
- UI: capturas 390/1280 claro/escuro comparadas com `docs/design/`.
- Pagamento: Vitest + `stripe listen` com cartão 4242 (repetido e concorrente).
- Geração: dublês gravados + 1 teste real por épico de geração.
- Deploy: `curl -I https://<app>.vercel.app/entrar` = 200.
