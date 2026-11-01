# AdFit — Documentação técnica

Descreve o sistema **como está implementado** (seção 19 do `docs/spec.md`). Atualizada no mesmo commit de toda mudança de schema, função, política, prompt ou lógica de tela. Estado atual: épicos 8.0, design, 8.1, 8.2, 8.9 e 8.3.

## 1. Modelo de dados

Banco Postgres (Supabase), schema `public`, nomes em português `snake_case` exatamente como a seção 7 do spec. Migrations em `supabase/migrations/` (fonte), `schema.sql` (dump gerado).

| Tabela | Para que serve |
|---|---|
| `marcas` | Cliente da plataforma: kit (nome, @, logo, cor, CTA, tom de voz), **idioma do texto dos vídeos** (`idioma_anuncios`, MD-1), saldo de créditos e se está ativa (pausada = não consome crédito). |
| `perfis` | Uma linha por usuário do Supabase Auth com acesso ao AdFit: papel (`admin_plataforma` ou `usuario_marca`), marca, **idioma da interface** (`idioma`, MD-1), ativo. Sem linha aqui = sem acesso (o Auth é compartilhado com outros apps). |
| `produtos` | Peça cadastrada pela marca. `ficha_aprovada_id` aponta a ficha usada nos anúncios. Arquivar = `arquivado`. |
| `fotos_produto` | 1 a 4 fotos originais da peça. |
| `fichas_produto` | Versões da ficha (imagem limpa frente/costas/logo). |
| `anuncios` | Anúncio de 15 s: opções escolhidas, roteiro, versão dos prompts, vídeo final, estado. `montagem_iniciada_em` e `tentativas_montagem` controlam o worker (D-3). |
| `cenas` | Exatamente 3 por anúncio; texto da tela (2 linhas × 32). |
| `quadros`, `clipes` | Versões de imagem e de vídeo de cada cena. |
| `geracoes` | Cada chamada à Higgsfield (só admin): modelo, payload, custo USD, tentativa, erro. |
| `movimentacoes_creditos` | Livro-razão **imutável** de créditos; a soma por marca é o saldo. |
| `pacotes_creditos` | Pacotes à venda, cada um com o Price da Stripe. |
| `pagamentos` | Uma linha por Checkout Session da Stripe. |
| `precos_acoes` | Preço em créditos de cada ação (regra 11.1). |
| `configuracoes` | Chave-valor da regra 11.6 (modelos, preços USD, cotações, contato de suporte). |

Enums: os da seção 7.2, na mesma ordem, mais `idioma` (`pt_br`, `en`) — emenda MD-1.

## 2. Relacionamentos

```
marcas 1─N perfis · produtos · fotos_produto · fichas_produto · anuncios · cenas · quadros · clipes · geracoes · movimentacoes_creditos · pagamentos
produtos 1─N fotos_produto, fichas_produto, anuncios;  produtos N─1 fichas_produto (ficha_aprovada_id)
anuncios N─1 fichas_produto (ficha congelada) · 1─3 cenas;  cenas 1─N quadros, clipes;  cenas N─1 quadros/clipes (versão atual)
clipes N─1 quadros (quadro de origem);  quadros/clipes/fichas N─1 geracoes
geracoes N─1 movimentacoes_creditos (cobranca_id);  movimentacoes N─1 movimentacoes (estorno_de_id)
pagamentos N─1 pacotes_creditos;  pagamentos 1─0..1 movimentacoes_creditos (compra)
```

## 3. Regras no banco

**Funções** (todas `set search_path = ''`; as de crédito só para `service_role`):

| Nome | O que faz |
|---|---|
| `eh_admin()` | true se o usuário logado é admin ativo. Usada nas políticas. |
| `minha_marca_id()` | marca do usuário logado; nula para admin, sem perfil ou desativado. |
| `debitar_creditos(marca, acao, itens, ref_tipo, ref_id, autor)` | Trava a marca, lê o preço atual, recusa `marca_inativa`/`saldo_insuficiente`, insere `consumo` e baixa o saldo. Preço 0 → nulo sem movimento. |
| `estornar_creditos(consumo, obs, [quantidade, ref_tipo, ref_id])` | Estorno integral ou parcial (D-1). Idempotente por consumo/item; nunca passa do valor consumido. |
| `lancar_creditos(marca, tipo, qtd, valor_pago, obs, autor, [moeda])` | Lançamento manual do admin (compra/bônus/ajuste) com as validações da 11.2.6 (D-2). |
| `creditar_pagamento(pagamento, payment_intent, valor, moeda)` | Credita compra da Stripe uma única vez; repetido devolve a mesma movimentação. |
| `estornar_pagamento(pagamento)` | Reembolso total: `reembolsado` + ajuste negativo até o saldo; diferença em `observacao`. Idempotente. |
| `pegar_proximo_anuncio_para_montar()` | Fila do worker com `for update skip locked`; ignora montagem em andamento (< 10 min) e anúncios com 3 tentativas (D-3). |
| `definir_atualizado_em()` | Atualiza `atualizado_em` (triggers `trg_*_atualizado_em`). |

**Triggers:** `trg_movimentacoes_imutaveis` (update/delete no livro-razão → erro), `trg_fotos_produto_limite` (5ª foto → erro), `trg_marcas_proteger_saldo` (saldo só muda dentro das funções, via `app.alterando_saldo`), `trg_marcas_atualizado_em`, `trg_produtos_atualizado_em`, `trg_anuncios_atualizado_em`, `trg_pacotes_creditos_atualizado_em`, `trg_pagamentos_atualizado_em`.

**Políticas (RLS):** nomes e regras da seção 6.4 (`marcas_select`, `marcas_update_kit`, `perfis_select`, `produtos_*`, `fotos_*`, `fichas_select`, `anuncios_select`, `anuncios_update_basico`, `cenas_select`, `quadros_select`, `clipes_select`, `geracoes_select_admin`, `movimentacoes_select`, `precos_select`, `pacotes_select`, `pagamentos_select`, `configuracoes_select_admin`). As colunas que o cliente pode escrever são limitadas por GRANT de coluna (ex.: em `marcas`, só o kit + `idioma_anuncios`; `saldo_creditos` e `ativa` nunca).

**Storage:** buckets privados `marcas` (5 MB, PNG/SVG/JPG), `produtos` (10 MB, JPG/PNG/HEIC/WEBP), `anuncios`. Políticas `storage_adfit_select/insert/update/delete`: 1º segmento do caminho = marca do usuário (ou admin); cliente só escreve em `marcas/<marca>/logo/*` e `produtos/<marca>/<produto>/originais/*`.

## 4. Mapa tela → tabelas (até o 8.1)

| Tela | Lê | Escreve (via) |
|---|---|---|
| Entrar, Definir/Redefinir senha | `perfis` (próprio) | Supabase Auth; `perfis.idioma` no 1º acesso (server action, service_role) |
| Casca da marca (todas as telas da marca) | `perfis`, `marcas` (nome, saldo, ativa), `configuracoes.contato_suporte` (servidor) | `perfis.idioma` (troca de idioma) |
| [Admin] Marcas | `marcas`, `anuncios` (contagem do mês) | `POST /api/admin/marcas` |
| [Admin] Marca | `marcas`, `perfis`, `movimentacoes_creditos`, `pagamentos` (+ `pacotes_creditos.nome`), `anuncios` | `PATCH /api/admin/marcas/:id` (kit, pausar), `POST /api/admin/creditos` (`lancar_creditos`), `POST /api/admin/usuarios`, `PATCH /api/admin/usuarios/:id` |
| [Admin] Usuários | `perfis` (+ `marcas.nome`), `marcas` | `POST /api/admin/usuarios`, `PATCH /api/admin/usuarios/:id` |
| [Marca] Créditos | `marcas`, `movimentacoes_creditos`, `precos_acoes`, `pagamentos` (+ `pacotes_creditos.nome`) | — |
| [Marca] Comprar créditos | `pacotes_creditos` (só ativos, por `ordem`), `marcas.ativa` | `POST /api/creditos/checkout` |
| [Marca] Compra concluída (`/creditos/obrigado`) | `pagamentos`, `marcas` | `fulfillCheckout` → `creditar_pagamento` (servidor) |
| [Admin] Configurações | `precos_acoes`, `pacotes_creditos`, `configuracoes` (service_role) | `PUT /api/admin/configuracoes`, `POST /api/admin/pacotes`, `PATCH /api/admin/pacotes/:id` |
| [Marca] Marca | `marcas` (kit), URL assinada do logo | `marcas` direto pela RLS `marcas_update_kit`; Storage `marcas/<marca>/logo/*` |
| [Marca] Produtos | `produtos` (não arquivados) + `fotos_produto` + `fichas_produto` (selo), URLs assinadas | — |
| [Marca] Novo produto | — | `produtos` (RLS `produtos_insert`), Storage `produtos/<marca>/<produto>/originais/*`, `fotos_produto` (RLS `fotos_insert`), `POST /api/fotos/:id/converter` (HEIC) |
| [Marca] Produto | `produtos`, `fotos_produto`, `precos_acoes` | `fotos_produto` delete (RLS `fotos_delete`), `produtos.arquivado` (RLS `produtos_update`) |
| Demais telas | ainda com dados fictícios do design (`src/features/fixtures`) | ligadas nos épicos seguintes |

## 5. Lógica por tela (até o 8.1)

- **Proxy (`src/proxy.ts`)**: renova a sessão; sem sessão → `/entrar` (APIs → 401 JSON); sem perfil → desloga e `/entrar?erro=sem_acesso`; desativado → desloga e `/acesso-desativado`; admin fica em `/admin`, marca fora de `/admin`; grava o cookie `adfit_idioma`.
- **Entrar**: `signInWithPassword`; erro genérico "E-mail ou senha incorretos." (não revela se o e-mail existe).
- **Esqueci a senha**: sempre a mesma resposta; link do e-mail → `/auth/confirm` → `/redefinir-senha?etapa=nova`.
- **Convite**: link do e-mail → `/auth/confirm` (verifyOtp) → `/definir-senha` (mín. 8 caracteres + confirmação) → Início.
- **Sair**: `POST /sair` (POST para o prefetch de links nunca deslogar ninguém).
- **Rotas de admin (`src/app/api/admin/*`)**: `requireAdminApi()` (401 sem sessão, 403 se não for admin ativo), corpo validado com Zod (`src/server/admin/schemas.ts`), lógica em `src/server/admin/*` com service_role. Erros do banco viram `{ erro, mensagem }` (`src/server/api/http.ts`): `saldo_negativo` → "O ajuste deixaria o saldo negativo." (422), `compra_exige_valor`, `observacao_obrigatoria`, `email_existente` (409)…
- **Fotos de produto (8.3)**: validação no navegador (JPG/PNG/HEIC/WEBP ≤ 10 MB, `src/lib/photo-rules.ts`; erro com a copy da seção 15); envio direto ao Storage com progresso (XHR com o token do usuário, `src/lib/storage-upload.ts`); `fotos_produto.storage_path` guarda o caminho com o bucket na frente (`produtos/<marca>/<produto>/originais/<uuid>.<ext>`, seção 7.3); HEIC → `POST /api/fotos/:id/converter` baixa do Storage, converte com `heic-convert`, grava `.jpg`, atualiza o caminho e apaga o `.heic`. Limite de 4 fotos na interface e no trigger `trg_fotos_produto_limite`.
- **Kit da marca (8.3)**: a própria marca grava nome, @, cor, CTA, tom e idioma dos vídeos direto pela RLS, validado com o mesmo schema do admin; o logo usa o mesmo `LogoUploader` do admin em modo marca.
- **Logo do kit**: `LogoUploader` (PNG/SVG/JPG ≤ 5 MB) envia direto do navegador ao bucket `marcas` em `<marca>/logo/<timestamp>.<ext>` (política `storage_adfit_insert`) e grava `logo_path` via `PATCH` (só aceita caminho da própria marca); prévia por URL assinada de 60 min. Reaproveitado na tela Marca do usuário (8.3).
- **Erros de marca pausada**: `marca_inativa` → 423 "Conta pausada. Fale com o suporte: {contato_suporte}".
- **Lançar créditos**: valor pago digitado em qualquer formato ("1.234,56", "US$ 65.00") → centavos (`src/lib/money.ts`); moeda BRL/USD/EUR.
- **Convidar**: recusa e-mail já em `perfis` ou no Auth; `inviteUserByEmail` com `redirectTo` para `/auth/confirm?next=/definir-senha`; se o perfil falhar, o usuário do Auth é removido.
- **Pausar marca**: `marcas.ativa = false` → faixa "Conta pausada" em todas as telas da marca, botões cobrados desabilitados (contexto `BrandStatusProvider` com saldo e pausa reais) e `debitar_creditos` recusa (`marca_inativa`).
- **Idioma (MD-1)**: antes do login, `Accept-Language`; no 1º acesso, gravado em `perfis.idioma`; troca no menu do perfil e no rodapé do admin.

## 6. Pipelines

### Pipeline de pagamento (seção 4.5, épico 8.9)
```
[Comprar créditos] "Pagar" → POST /api/creditos/checkout (usuario_marca ativo, marca ativa, pacote ativo)
   └─ insere pagamentos (status iniciado; créditos/valor/moeda congelados)
   └─ Stripe Checkout Session: mode=payment, 1 item (Price do pacote), client_reference_id=marca,
      metadata={pagamento_id, marca_id, pacote_id}, success_url=/creditos/obrigado?session_id={CHECKOUT_SESSION_ID},
      cancel_url=/creditos?compra=cancelada
   └─ grava stripe_checkout_session_id → navegador vai para checkout.stripe.com
[Stripe] pagamento → dois caminhos chamam a MESMA função, ambos idempotentes:
   (1) webhook POST /api/webhooks/stripe — corpo bruto + assinatura STRIPE_WEBHOOK_SECRET (inválida → 400, sem efeito)
   (2) página /creditos/obrigado (atalho para o saldo aparecer mesmo com webhook atrasado; webhook é obrigatório)
   └─ fulfillCheckout(sessionId): retrieve com line_items; confere metadata.pagamento_id ↔ sessão ↔ Price do pacote;
      se payment_status='paid' → creditar_pagamento (trava a linha; já pago → devolve a mesma movimentação)
```
| Evento | Efeito |
|---|---|
| `checkout.session.completed` / `checkout.session.async_payment_succeeded` | `fulfillCheckout` (credita se `paid`) |
| `checkout.session.async_payment_failed` | `iniciado` → `falhou` (sem crédito) |
| `checkout.session.expired` | `iniciado` → `expirado` (sem crédito) |
| `charge.refunded` total | `estornar_pagamento`: `reembolsado` + `ajuste_manual` negativo até o saldo; diferença anotada em `observacao` |
| `charge.refunded` parcial | só anota em `pagamentos.observacao` (alerta na aba Pagamentos do admin) |

Idempotência: `creditar_pagamento` (trava + status), `pagamentos_stripe_checkout_session_id` único, `movimentacoes.pagamento_id` único; status finais só saem de `iniciado`. Teste automatizado: 3 chamadas a `fulfillCheckout` (1 + 2 em paralelo) = 1 crédito. Teste manual (01/11/2026, sandbox Dab Lab): cartão 4242 → webhook 200 → +50; recarga da página e `stripe events resend` → continua 1 crédito; reembolso → −50.

Admin: pacotes só são criados/alterados se o Price existir na Stripe, ativo, `one_time`, com a mesma moeda e valor (`assertStripePrice`).

### Pipeline de geração
Entra nos épicos 8.4–8.7.

## 7. Divergências em relação ao spec

| # | Divergência | Por quê |
|---|---|---|
| D-1 | `estornar_creditos` ganhou `p_quantidade`, `p_referencia_tipo`, `p_referencia_id` opcionais | A assinatura da 7.5 só estorna o consumo inteiro, mas a regra 11.2.4 exige estorno de 4 créditos por cena. Sem os parâmetros, comportamento igual ao spec. |
| D-2 | `lancar_creditos` ganhou `p_moeda` | A regra 11.2.6 e a rota `POST /api/admin/creditos` exigem moeda na compra; a assinatura da 7.5 não tinha. |
| D-3 | `anuncios.montagem_iniciada_em` e `anuncios.tentativas_montagem` | Necessárias para "sem montagem em andamento" (7.5) e "até 3 tentativas" (12.2); o spec não tinha onde guardar. |
| D-4 | Políticas de Storage com nomes `storage_adfit_*` | A 6.4 descreve as regras de Storage mas não nomeia as políticas. |
| D-5 | GRANTs de coluna em `produtos` (cliente não grava `ficha_aprovada_id`) | Aprovar ficha é rota de servidor (seção 13); a 6.4 só dizia "insert/update na própria marca". |
| D-6 | Projeto Supabase compartilhado "BANCO DE TESTE" (us-east-2) | Decisão do Alexandre (31/10/2026); a seção 20 preferia São Paulo. Migrations no remoto via `apply_migration`, não `db push`, para não misturar com o histórico de outros apps. |
| D-7 | Modelos de e-mail usam `{{ .RedirectTo }}` em vez de `{{ .SiteURL }}` e são bilíngues | O Site URL do projeto compartilhado é de outro app; MD-1. |
| D-8 | Admin altera `marcas` (kit, pausar) só por rota de servidor (`PATCH /api/admin/marcas/:id`) | O GRANT de coluna vale para todo `authenticated`; a 6.4 permitia ao admin escrever direto. Mais restritivo, mesmo resultado na interface. |
| D-9 | Pacotes de créditos entram por `scripts/seed-admin.ts`, não por `seed.sql` | Dependem dos Price IDs da Stripe em variáveis de ambiente (seção 7.6). |
| D-10 | GRANT de coluna esconde `anuncios.roteiro/prompt_versao/erro/montagem_*`, `cenas.prompt_*` e `quadros.qc_detalhe` do cliente | A RLS da 6.4 liberava as linhas inteiras e a API REST devolveria prompts à própria marca, contra a seção 5 e o princípio 5. Admin lê pelo servidor. Teste `04_colunas_ocultas.test.sql`. |
| D-11 | `cancel_url = /creditos?compra=cancelada` (spec: `/creditos`) | A tela precisa saber que voltou de um cancelamento para mostrar "Compra cancelada. Nada foi cobrado." |
| D-12 | `estornar_pagamento` acrescenta a nota em `observacao` (migration 20261101000800) | A versão original sobrescrevia a nota de um reembolso parcial anterior (bug achado por teste). |
| D-13 | Checkout envia `customer_email` e `locale` do usuário | E-mail pré-preenchido e página da Stripe no idioma do usuário (MD-1). |
| D-14 | Conversão HEIC → JPG por `POST /api/fotos/:id/converter` depois do envio direto ao Storage | A Vercel limita o corpo das funções a 4,5 MB; fotos vão até 10 MB. A rota não está na seção 13. |
| MD-1 | App em pt-BR e inglês | Emenda do Alexandre (`docs/mudancas-de-escopo.md`); diverge da seção 17. |
| MD-2 | Crédito "Feito pela Dab Lab" | Emenda do Alexandre. |
