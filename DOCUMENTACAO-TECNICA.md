# AdFit — Documentação técnica

Descreve o sistema **como está implementado** (seção 19 do `docs/spec.md`). Atualizada no mesmo commit de toda mudança de schema, função, política, prompt ou lógica de tela. Estado atual: épicos 8.0 a 8.9 (MVP completo), com as emendas MD-1 a MD-16 de `docs/mudancas-de-escopo.md`.

## 1. Modelo de dados

Banco Postgres (Supabase), schema `public`, nomes em português `snake_case` exatamente como a seção 7 do spec. Migrations em `supabase/migrations/` (fonte), `schema.sql` (dump gerado).

| Tabela | Para que serve |
|---|---|
| `marcas` | Cliente da plataforma: kit (nome, @, logo, cor, CTA **opcional** — MD-13, tom de voz), **idioma do texto dos vídeos** (`idioma_anuncios`, MD-1), saldo de créditos e se está ativa (pausada = não consome crédito). |
| `perfis` | Uma linha por usuário do Supabase Auth com acesso ao AdFit: papel (`admin_plataforma` ou `usuario_marca`), marca, **idioma da interface** (`idioma`, MD-1), ativo. Sem linha aqui = sem acesso (o Auth é compartilhado com outros apps). |
| `produtos` | Peça cadastrada pela marca. `ficha_aprovada_id` aponta a ficha usada nos anúncios. Arquivar = `arquivado`. |
| `fotos_produto` | 1 a 4 fotos originais da peça. |
| `fichas_produto` | Versões da ficha (imagem limpa frente/costas/logo). |
| `anuncios` | Anúncio de 15 s: opções escolhidas (com `com_texto` e `com_fecho` — MD-15), roteiro, versão dos prompts, vídeo final, estado, `arquivado` (D-24). `montagem_iniciada_em` e `tentativas_montagem` controlam a montagem (D-3, D-23). |
| `cenas` | Exatamente 3 por anúncio; texto da tela (2 linhas × 32). |
| `quadros`, `clipes` | Versões de imagem e de vídeo de cada cena. |
| `geracoes` | Cada chamada à Higgsfield (só admin): modelo, payload, custo USD, tentativa, erro. |
| `movimentacoes_creditos` | Livro-razão **imutável** de créditos; a soma por marca é o saldo. |
| `pacotes_creditos` | Pacotes à venda, cada um com o Price da Stripe. |
| `pagamentos` | Uma linha por Checkout Session da Stripe. |
| `precos_acoes` | Preço em créditos de cada ação (regra 11.1). |
| `feedbacks` | Problemas e sugestões enviados pelos usuários (MD-6); cada um lê os próprios, o admin lê todos e muda o status. |
| `pedidos_convite` | Pedidos de acesso da tela pública (MD-9); só o admin lê e muda o status. |
| `downloads_anuncio` | Um registro por download do vídeo final (métrica da seção 21); gravado pelo servidor, lido só pelo admin. FK composta (anúncio, marca). |
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
| `pode_gravar_original(nome)` | Usada nas políticas de Storage: o objeto `<marca>/<produto>/originais/*` é de produto da marca do usuário (ou admin) e sem ficha aprovada. |
| `aprovar_ficha(ficha)` | Aprova uma versão da ficha (`aguardando_aprovacao`, `aprovada` ou `descartada` com imagem): as demais viram `descartada` e `produtos.ficha_aprovada_id` aponta para ela. Só `service_role`. |
| `pegar_proximo_anuncio_para_montar()` | Fila do worker com `for update skip locked`; ignora montagem em andamento (< 10 min) e anúncios com 3 tentativas (D-3). |
| `definir_atualizado_em()` | Atualiza `atualizado_em` (triggers `trg_*_atualizado_em`). |

**Triggers:** `trg_movimentacoes_imutaveis` (update/delete no livro-razão → erro), `trg_fotos_produto_limite` (5ª foto → erro), `trg_marcas_proteger_saldo` (saldo só muda dentro das funções, via `app.alterando_saldo`), `trg_marcas_atualizado_em`, `trg_produtos_atualizado_em`, `trg_anuncios_atualizado_em`, `trg_pacotes_creditos_atualizado_em`, `trg_pagamentos_atualizado_em`.

**Políticas (RLS):** nomes e regras da seção 6.4 (`marcas_select`, `marcas_update_kit`, `perfis_select`, `produtos_*`, `fotos_*`, `fichas_select`, `anuncios_select`, `anuncios_update_basico`, `cenas_select`, `quadros_select`, `clipes_select`, `geracoes_select_admin`, `movimentacoes_select`, `precos_select`, `pacotes_select`, `pagamentos_select`, `configuracoes_select_admin`). As colunas que o cliente pode escrever são limitadas por GRANT de coluna (ex.: em `marcas`, só o kit + `idioma_anuncios`; `saldo_creditos` e `ativa` nunca).

**Caminhos amarrados (migration 20261101000900):** CHECK `fotos_produto_caminho_chk` (`produtos/<marca_id>/<produto_id>/originais/<arquivo>`) e `marcas_logo_caminho_chk` (`<marca_id>/logo/<arquivo>`); função `pode_gravar_original(nome)` nas políticas de escrita do bucket `produtos` (produto da própria marca, sem ficha aprovada). O servidor só assina/baixa/converte com service_role dentro da pasta da marca dona (`signMany`, `signedLogoUrl`, `convertHeicPhoto`).

**Índice `fichas_produto_uma_gerando_uidx`:** no máximo uma ficha `gerando` por produto (regra da seção 13 contra cliques simultâneos; o servidor estorna se o índice recusar).

**Storage:** buckets privados `marcas` (5 MB, PNG/SVG/JPG), `produtos` (10 MB, JPG/PNG/HEIC/WEBP), `anuncios`. Políticas `storage_adfit_select/insert/update/delete`: 1º segmento do caminho = marca do usuário (ou admin); cliente só escreve em `marcas/<marca>/logo/*` e `produtos/<marca>/<produto>/originais/*`.

## 4. Mapa tela → tabelas

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
| [Marca] Novo anúncio | `produtos` com ficha aprovada (URL assinada da ficha), `precos_acoes` | `POST /api/anuncios` |
| [Marca] Anúncio | `anuncios`, `cenas`, `quadros`, `clipes` (sem colunas técnicas; service_role com posse conferida) | `GET /api/anuncios/:id` (polling + varredura), `PATCH /api/anuncios/:id` (arquivar), `PATCH .../textos`, `POST .../gerar-video`, `GET .../download` (+ `downloads_anuncio`), `POST /api/cenas/:id/{refazer-quadro,usar-quadro,refazer-clipe,usar-clipe}` (com atalhos de refação) |
| [Marca] Anúncios | `anuncios` (não arquivados; filtro por produto e status) + quadro atual da cena 1, `produtos` | — |
| [Marca] Créditos | `movimentacoes_creditos` com o item de cada linha (ficha → produto; quadro/clipe/anúncio → anúncio), `precos_acoes`, `pacotes_creditos` na moeda do idioma (MD-16), `pagamentos` | — |
| [Admin] Custos | `marcas`, `anuncios`, `movimentacoes_creditos`, `geracoes`, `pagamentos` (pagos), `downloads_anuncio`, `configuracoes` (cotações) | `GET /api/admin/custos/csv` (seção 14) |
| [Admin] Gerações | `geracoes` (+ `marcas.nome`), URL assinada do resultado | `POST /api/admin/geracoes/:id/reconsultar` |
| [Admin] Pedidos de acesso | `pedidos_convite` | `PATCH /api/admin/pedidos/:id`, convite |
| Fale com a gente (`/feedback`) | — | `POST /api/feedback` (RLS `feedbacks_insert`) |
| [Admin] Feedbacks | `feedbacks` + `perfis`, `marcas` (service_role) | `PATCH /api/admin/feedbacks/:id` |
| [Admin] Configurações | `precos_acoes`, `pacotes_creditos`, `configuracoes` (service_role) | `PUT /api/admin/configuracoes`, `POST /api/admin/pacotes`, `PATCH /api/admin/pacotes/:id` |
| [Marca] Marca | `marcas` (kit), URL assinada do logo | `marcas` direto pela RLS `marcas_update_kit`; Storage `marcas/<marca>/logo/*` |
| [Marca] Produtos | `produtos` (não arquivados) + `fotos_produto` + `fichas_produto` (selo), URLs assinadas | — |
| [Marca] Novo produto | — | `produtos` (RLS `produtos_insert`), Storage `produtos/<marca>/<produto>/originais/*`, `fotos_produto` (RLS `fotos_insert`), `POST /api/fotos/:id/converter` (HEIC) |
| [Marca] Produto | `produtos`, `fotos_produto`, `fichas_produto` (versões com URL assinada), `precos_acoes` | `fotos_produto` delete (RLS `fotos_delete`), `produtos.arquivado` (RLS `produtos_update`), `POST /api/produtos/:id/ficha`, `GET /api/produtos/:id/ficha` (polling 5 s), `POST /api/fichas/:id/aprovar` |

## 5. Lógica por tela

- **Proxy (`src/proxy.ts`)**: renova a sessão; sem sessão → `/entrar` (APIs → 401 JSON); sem perfil → desloga e `/entrar?erro=sem_acesso`; desativado → desloga e `/acesso-desativado`; admin fica em `/admin`, marca fora de `/admin`; grava o cookie `adfit_idioma`.
- **Entrar** (MD-7): botão do Google (GIS) + `signInWithIdToken` com nonce; só entra quem tem perfil. Formulário de e-mail e senha só em desenvolvimento. Vitrine do fluxo, troca PT/EN e "Pedir um convite" (MD-9).
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
- **Saldo da Higgsfield esgotado** (`server/higgsfield/provider-health.ts`): a geração finalizada mais recente foi erro de saldo (`not_enough_credits` / "credit balance is too low") há menos de 2 h → faixa vermelha em todas as telas do admin e `assertProviderAvailable()` barra ficha, anúncio, vídeo e refações **antes do débito** (`servico_indisponivel`, 503, "Nada foi cobrado"). Uma geração concluída depois limpa o aviso. Na tela do anúncio, a etapa que falhou explica que os créditos voltaram.
- **Pagamentos na tela Créditos**: o lojista vê só `pago`, `reembolsado` e `falhou`; tentativas `iniciado`/`expirado` ficam só no admin (aba Pagamentos da marca).
- **Atalhos de refação**: ficha, imagem e cena em vídeo têm botões com os problemas comuns (`lib/redo-shortcuts.ts`); cada um vira uma linha fixa em inglês acrescentada pelo código (`server/prompts/redo-shortcuts.ts`), além do texto livre que passa pelo `refacao.v2`.
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

### Pipeline de geração — ficha de produto (épico 8.4)
1. `POST /api/produtos/:id/ficha` confere o produto: da marca, não arquivado, com ≥1 foto e sem ficha `gerando`.
2. `debitar_creditos` primeiro: `gerar_ficha` (2) se nenhuma versão tem imagem, senão `refazer_ficha` (1). A referência é o id da nova versão. Sem saldo ou com a marca pausada, nada é criado.
   - A versão é criada `gerando`; se o índice único recusar o 2º clique, há estorno e resposta 409.
   - A geração nasce `na_fila` antes do Claude. Se a função for encerrada no meio, a varredura de órfãs (`na_fila` sem `request_id` há mais de 6 min) faz falha e estorno.
3. Refação: o Claude (Anexo C.3, `salvar_prompt`, 2 tentativas, modelo `modelo_claude_roteiro`) traduz o pedido. O prompt é o C.1 (v1) ou o texto do Claude, mais `CLAUSULA_IMAGEM` concatenada pelo código.
4. `geracoes` recebe `modelo` = `configuracoes.modelo_imagem` (MD-4: Grok Imagine 2.0) e `entrada` = prompt, versão do prompt e **caminhos** das fotos (sem URL assinada).
5. Submissão (`src/server/higgsfield/`):
   - URLs de entrada: assinadas (60 min) quando o Storage é https; no ambiente local, upload pela API da Higgsfield (D-17).
   - `hf_webhook` só quando `APP_URL` é https.
   - No máximo 10 submissões simultâneas por instância.
6. Resultado, por qualquer um dos três caminhos:
   - webhook `POST /api/webhooks/higgsfield?token=` (token em tempo constante; assinatura Standard Webhooks se `HF_WEBHOOK_SECRET` existir, D-16);
   - polling de reserva disparado pela tela (D-15);
   - "Reconsultar" do admin.
7. `completed`: baixa, grava em `produtos/<marca>/<produto>/fichas/v<n>-<geracao>.<ext>` e só então a ficha vira `aguardando_aprovacao`. Depois a geração vira `concluida` com `custo_usd` = `preco_usd_por_imagem`. Idempotente por `request_id`: estado final não muda; upload com caminho determinístico.
8. `failed`, `nsfw`, erro de submissão ou timeout de 15 min:
   - tentativa 1 com prompt → nova geração (tentativa 2, mesma cobrança, sem débito), trocada na ficha só se ela ainda segue a tentativa 1;
   - falha no preparo (sem prompt, ex.: o Claude falhou) → falha definitiva direto;
   - `custo_usd` fica nulo nas falhas (7.3); um `completed` atrasado de tentativa substituída registra o custo sem tocar a ficha;
   - tentativa 2 → ficha `falhou` + `estornar_creditos` integral (idempotente);
   - a tela mostra "Algo deu errado do nosso lado…".
9. `POST /api/fichas/:id/aprovar` → `aprovar_ficha`. As fotos originais congelam (`pode_gravar_original`). Voltar para uma versão anterior é aprovar uma `descartada`, sem custo.

Quadros e clipes (8.5–8.7) reutilizam `submitGeneration`/`applyResult`/`failGeneration`.

### Pipeline de geração — anúncio: roteiro e quadros (épico 8.5)
1. `POST /api/anuncios` confere o produto (da marca, não arquivado, com ficha aprovada).
   - Debita `gerar_roteiro_quadros` (2) com o id do novo anúncio.
   - Cria o anúncio `gerando_roteiro` com a ficha congelada e responde 202. O resto roda em `after()` (`runLater`).
2. **Roteiro:** o Claude (`modelo_claude_roteiro`, `roteiro.v2` + tabelas C.5) recebe a ficha como imagem JPEG reduzida (sharp, lado ≤ 1568 px). A ferramenta `salvar_roteiro` é validada com Zod (C.2 + `modelo`), com 2 tentativas. Falha → `falhou` + estorno integral.
3. **Texto da tela:**
   - regex dos termos proibidos (pt/en) → `descricao` neutra (D-21);
   - revisão `qc-texto.v2` (`modelo_claude_qc_texto`, Haiku);
   - 2×32 (11.7); `com_texto = false` e a cena 3 ficam sem texto.
4. **Gravação:** 3 `cenas` (unique por ordem impede duplicar) → `gerando_quadros` (roteiro e `prompt_versao = roteiro.v2+quadro.v2`) → 3 `quadros` v1, cada um com uma `geracoes` `quadro_chave`, submetidos em paralelo.
   - O prompt de cada quadro é montado pelo código: cena + modelo única + referência à ficha + "Dress the model…" + `CLAUSULA_IMAGEM`.
5. **Resultado** (webhook, polling ou admin): copia para `anuncios/<marca>/<anuncio>/quadros/…` e grava `imagem_path`; o QC roda em `after()`.
6. **QC** (`qc-quadro.v1`, ficha + quadro), com aprovação calculada no código (11.5):
   - 1ª reprovação → nova geração do mesmo quadro, sem cobrança e com o motivo no prompt;
   - 2ª reprovação → `pronto` com aviso;
   - impróprio → `falhou`, nunca exibido (D-18);
   - Claude indisponível → `pronto` sem aviso (D-19).
7. **Fechamento** (`checkAdProgress`), quando a versão mais recente de cada cena está final:
   - `cenas.quadro_atual_id` aponta para o quadro pronto;
   - ≥ 1 pronto → `aguardando_aprovacao`; 3 falharam → `falhou` + estorno integral.
8. **Órfãos** (`refreshAd`, chamado pelo polling da tela):
   - roteiro parado há mais de 6 min sem cenas → `falhou` + estorno;
   - cena sem quadro → quadro `falhou`;
   - gerações paradas → reconsulta e timeout;
   - QC que não rodou há mais de 3 min → roda.
9. Estados do anúncio só mudam por `transition()` (`ads/stateMachine.ts`, 12.2), com update condicional por status.

Imagens das cenas no modelo `modelo_quadro` (Marketing Studio Flare, MD-12); a ficha segue em `modelo_imagem` (Grok). Nova tentativa pós-nsfw manda a ficha sem o painel do close (B-9).

### Pipeline do vídeo — clipes e montagem (épicos 8.6/8.7; D-23)
1. `POST /api/anuncios/:id/gerar-video`: 3 quadros atuais `pronto` e nenhum gerando → debita `gerar_video` (45, MD-4a) **uma vez** com referência ao anúncio → `gerando_clipes` → 3 `clipes` + `geracoes` `clipe_video` (Seedance 2.5, 5 s, 1080p, `generate_audio: true` — MD-11). Prompt: `prompt_movimento` (roteiro.v4: duas ações por cena — MD-10) + `CLAUSULA_AUDIO` + `CLAUSULA_VIDEO` no fim.
2. Resultado copiado para `anuncios/<marca>/<anuncio>/clipes/…`. Falha definitiva da cena → clipe `falhou` + estorno de `floor(45/3) = 15` (referência ao clipe); a cena mostra "Refazer cena".
3. `checkClipsProgress`: 3 clipes prontos e atuais → `montando` (`requestMontage`) e a montagem roda em `after()`; alguma cena falhou → `aguardando_aprovacao`.
4. **Montagem** (`server/video/assemble.ts`, ffmpeg-static na função da Vercel): cada clipe em 2 planos de 2,5 s, o 2º com zoom de 12% (MD-10); texto da cena em PNG (Inter Bold via opentype.js — o ffmpeg Linux não tem drawtext, B-8); som ambiente dos clipes com entrada suave e compressor (B-13); fecho opcional (MD-15) como cartela desfocada e escurecida com logo/nome, CTA opcional (MD-13) e oferta (MD-14); H.264 High 30 fps CRF 20, AAC, faststart. Grava `video/v<n>.mp4` e vai a `pronto`.
5. **Retentativas e órfãos:** `refreshAd` (polling da tela e varredura a cada 5 min — `/api/cron/varredura`) refaz montagem parada há mais de 10 min (até 3 tentativas) e, com `gerando_clipes` parado há mais de 6 min sem clipe gerando, estorna débitos sem clipe (`sweepOrphanClips`, B-14).
6. **Ajustes grátis:** editar texto com o vídeo pronto, usar outra versão de clipe → `versao_montagem++` e remonta. `refazer_clipe` (15) gera nova versão da cena (atalhos de refação + `refacao.v2`).
7. **Download:** URL assinada de 60 min com o nome da regra 8.7; download do lojista (não do admin) gera um registro em `downloads_anuncio`.

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
| D-15 | `GET /api/produtos/:id/ficha` (estado das versões para o polling de 5 s) também dispara o polling de reserva das gerações paradas há mais de 3 min | Rota fora da seção 13. Até o worker do 8.6 existir não há processo periódico (a Vercel Hobby só tem cron diário); a tela aberta faz a reconsulta. |
| D-16 | Webhook da Higgsfield confere também a assinatura Standard Webhooks (`webhook-signature`, segredo `whsec_` em `HF_WEBHOOK_SECRET`), além do token da query | A documentação atual da Higgsfield assina as entregas (MD-4); o token continua obrigatório. |
| D-17 | As fotos de entrada são convertidas para JPEG pelo conteúdo (`toJpeg`) e sobem pela API de upload da Higgsfield, em vez de URL assinada (em todos os ambientes desde 01/11/2026) | O Storage local não é alcançável pela Higgsfield. Em produção, uma foto `.jpg` que por dentro era HEIF foi recusada pelo modelo; a conversão no servidor resolve qualquer formato. |
| D-18 | Cena com quadro `falhou` (falha técnica ou conteúdo impróprio) e as outras prontas: o anúncio vai a `aguardando_aprovacao`, a cena mostra a falha e a nova tentativa dela será **grátis** (rota de refazer do 8.6). Sem estorno por cena | A 12.2 só prevê "3 prontos" ou "3 falharam". O preço é 2 créditos para roteiro + 3 quadros, e `floor(2/3) = 0` por cena. A 11.5 pede estorno para conteúdo impróprio; a tentativa grátis cumpre a intenção "não cobrar por falha nossa" (decisão do Alexandre em 01/11/2026). |
| D-19 | QC indisponível (o Claude falhou 2×): o quadro fica `pronto` com `qc_aprovado` nulo, sem aviso | O spec não diz o que fazer quando o QC não roda; sem QC não há como reprovar. |
| D-20 | `GET /api/anuncios/:id`: estado para o polling de 5 s; também roda a varredura de órfãos do anúncio | Rota fora da seção 13, como a D-15. |
| D-21 | `roteiro.v2` pede a `descricao` no idioma de quem cria (`{idioma_descricao}`) e o texto da tela no idioma da marca. Texto barrado pela regex só é trocado pela `descricao` se os idiomas forem iguais; senão, a cena fica sem texto | A `descricao` é para o lojista (seção 15); o texto do vídeo segue a marca (MD-1). |
| D-22 | `PATCH /api/anuncios/:id/textos` não aceita `cta` | `anuncios` não tem coluna de CTA (seção 7.3); o CTA do fecho vem de `marcas.cta_padrao`, editado na tela Marca. |
| MD-3 | Modelos Claude: `claude-sonnet-5` (roteiro, refação, QC de imagem) e `claude-haiku-4-5` (QC de texto, nova chave `modelo_claude_qc_texto`) | O spec citava `claude-sonnet-5-5`/`claude-haiku-5-5`, que não existem; decisão do Alexandre. |
| MD-4 / MD-4a | Imagem: Grok Imagine 2.0 (`xai/grok-imagine-image-2.0`); vídeo: Seedance 2.5 1080p (`bytedance/seedance-2.5/image-to-video`); `gerar_video` = 45, `refazer_clipe` = 15 (MD-4a; antes 51/17); pacotes de 60 por US$ 36 e de 150 por US$ 81 | Nano Banana não existe na Higgsfield API; o Seedance foi escolhido pela qualidade e custa ~US$ 17 por vídeo, então os preços foram revistos para margem ≥ 30% (decisão do Alexandre, 25.5 e 25.1). |
| MD-5 | Login com Google (só e-mails já convidados) | Emenda do Alexandre; o OAuth volta por `/auth/confirm`. |
| MD-6 | Feedback do usuário (tabela `feedbacks`, telas `/feedback` e `/admin/feedbacks`) | Emenda do Alexandre. |
| MD-7 | Login só com Google (GIS + `signInWithIdToken`); convite sem senha com e-mail de boas-vindas (Resend) | Emenda do Alexandre; substitui as seções 6.1/6.2. |
| MD-8 | Eventos de produto para o Visão de Produto (`src/server/analytics/track.ts`, `POST /api/eventos`) | Emenda do Alexandre; lista de eventos em `docs/mudancas-de-escopo.md`. |
| D-23 | Montagem do vídeo com ffmpeg (`ffmpeg-static`) numa função da Vercel, sem worker separado (`src/server/video/assemble.ts`, `ads/clips.ts`); verificação em `GET /api/admin/saude` | Decisão do Alexandre; o spec previa worker com Dockerfile (Railway/Fly). |
| MD-9 | Pedido de convite (`/pedir-convite`, `pedidos_convite`, [Admin] Pedidos de acesso) e novo layout da tela Entrar | Emenda do Alexandre. |
| MD-1 | App em pt-BR e inglês | Emenda do Alexandre (`docs/mudancas-de-escopo.md`); diverge da seção 17. |
| MD-2 | Crédito "Feito pela Dab Lab" (link para dablab.com.br) | Emenda do Alexandre. |
| MD-10 | 2 planos de 2,5 s por cena (zoom no 2º); `roteiro.v4` com duas ações por cena | Ritmo de Reels sem custo extra. |
| MD-11 | Som ambiente do Seedance (sem música/fala) no lugar da faixa muda | Pedido do Alexandre; mesmo preço. |
| MD-12 | Imagens das cenas no Marketing Studio 2.5 Flare (`modelo_quadro`, `preco_usd_por_quadro` = US$ 0,07 pelo extrato) | O Grok barrava como nsfw toda cena de corrida com top. |
| MD-13 | CTA da marca opcional | Pedido do Alexandre. |
| MD-14 | Fecho como cartela desfocada e escurecida (o logo nunca cobre a peça) | O logo cobria a modelo no 16:9. |
| MD-15 | Fecho opcional por anúncio (`anuncios.com_fecho`) | O lojista pode querer só as cenas. |
| MD-16 | Pacotes por moeda; a tela mostra os da moeda do idioma (pt-BR → BRL) | A conta Stripe brasileira só cobra cartão brasileiro em BRL. |
| D-25 | Tabela `downloads_anuncio` | A métrica "anúncios baixados por semana" (seção 21) precisa do registro; o spec não tinha onde guardar. |
| D-26 | Meta "créditos por anúncio pronto ≤ 22" (seção 21) não se aplica | Com os preços do MD-4a um anúncio completo custa 47 créditos; o painel mostra o valor sem meta. |

### Varredura periódica (01/11/2026)
`GET /api/cron/varredura` (Bearer `CRON_SECRET`, fora do proxy) roda `refreshAd` em todos os anúncios em `gerando_*`/`montando`: a montagem e suas retentativas não dependem mais da tela do anúncio aberta. Disparo a cada 5 min por `.github/workflows/varredura.yml` (o plano Hobby da Vercel só aceita cron diário, que fica como reserva em `apps/web/vercel.json`). `CRON_SECRET` precisa existir na Vercel (Production) e nos secrets do repositório GitHub.

### D-24 — Arquivar anúncio (01/11/2026)
`PATCH /api/anuncios/:id { arquivado: true }` (rota fora da seção 13; a ação "Arquivar anúncio" está nas seções 6 e 10). Marca só os próprios, admin qualquer; recusado com o anúncio gerando/montando ou com imagem/cena refazendo. Nada é apagado (vídeo, gerações e extrato ficam); some da lista e da tela.
