# SDD — AdFit (nome provisório): plataforma de anúncios em vídeo com IA para marcas de roupa fitness

| Campo | Valor |
|---|---|
| Versão do documento | 0.2 |
| Responsável de produto | Alexandre Siqueira (Dab Lab) |
| Cliente piloto | Kore Active (@kore_active) |
| Status | rascunho — pronto para revisão |
| Data | 31/10/2026 |
| Mudanças na 0.2 | pagamento online de créditos com Stripe Checkout entra no MVP (cliente piloto fora do Brasil); geração das telas pelo próprio Claude Code a partir do `prompt-design-adfit.md` |

---

## Como usar este documento

Este spec é a fonte única de verdade da plataforma. Ele será consumido pelo Claude Code para implementar o MVP (que já é o piloto com a Kore Active, operado pelo próprio dono da loja, sem intermediário).

Antes de gerar qualquer código, revise a **seção 24 (Assunções declaradas)**. **Assunção não revisada vira verdade no minuto em que o agente começa a codar.** Itens da **seção 25 (Perguntas abertas)** não podem ser decididos pelo agente: ao cruzar com um deles, ele pergunta.

A numeração das seções é estável. Prompts futuros referenciam "seção 11.2", "regra 11.3.4".

---

## 0. Princípios não-negociáveis

1. **Imagem antes de vídeo.** Nenhum vídeo é gerado a partir de um quadro-chave que o usuário não aprovou. A iteração acontece na fase barata (imagem); a fase cara (vídeo) só roda sobre decisão tomada.
2. **A peça é sagrada.** Cor, corte, costuras e logo da peça no anúncio têm que bater com a ficha de produto aprovada. Na dúvida entre um quadro mais bonito e um quadro mais fiel à peça, vence o mais fiel.
3. **Texto e logo saem do código, nunca do modelo de IA.** Todo texto na tela, CTA e logo final são sobrepostos na montagem (ffmpeg), com fonte e grafia controladas. O modelo de vídeo é instruído a não gerar texto.
4. **Todo custo é visível antes do clique.** Toda ação que consome crédito mostra quantos créditos vai consumir no próprio botão, e nenhuma ação consome crédito sem saldo suficiente.
5. **O dono da loja não precisa saber nada de IA.** Nenhuma tela mostra prompt, nome de modelo, parâmetro técnico ou jargão. O usuário escolhe opções de negócio (onde, quem, que esporte, que formato) e dá instruções de refação em português comum.

---

## 1. Visão e problema

**O que é.** Uma aplicação web em que uma marca de roupa fitness sobe fotos de uma peça (como tiver: no cabide, em cima da mesa, vestida), escolhe algumas opções de anúncio — cenário, modalidade esportiva, modelo, estilo, formato — e recebe um vídeo de anúncio de 15 segundos pronto para Reels/Stories ou feed horizontal, com a peça fiel ao original, texto e logo da marca aplicados.

**Para quem.** Donos e equipes pequenas de lojas e marcas de roupa de ginástica que precisam de criativo novo toda semana para Instagram e anúncios pagos, mas não têm verba para produção com modelo e fotógrafo nem tempo para aprender ferramentas de IA.

**Que dor resolve.** Criativo de vídeo envelhece rápido e precisa ser renovado com frequência. A alternativa hoje é produção tradicional (cara e lenta) ou aprender a operar modelos de IA (prompts, referências, consistência de produto), o que exige tempo que o lojista não tem. A plataforma embala o conhecimento — os prompts, o fluxo e a checagem de qualidade — e entrega o resultado. É a mesma lógica de comprar roupa em vez de costurar: dá para aprender, mas não vale o tempo.

**Diferencial.** Prompts especializados no vertical fitness, versionados e melhorados com o uso; fluxo em etapas que protege a fidelidade da peça; checagem automática de qualidade; e economia de tempo.

**Anti-escopo (o que este produto não é):**
- Não é editor de vídeo. O usuário não corta, não arrasta, não mexe em timeline.
- Não é ferramenta genérica de IA. Não aceita prompt livre, não gera nada fora de "anúncio de peça de roupa fitness".
- Não publica no Instagram nem gerencia campanha paga (roadmap avalia publicação).
- Não gera modelo falando para a câmera (roadmap).
- Não cria avatares ou réplicas de pessoas reais.

---

## 2. Personas e cenários de uso

**Dono da loja (persona principal — o irmão do Alexandre, na Kore Active).** Opera sozinho, provavelmente pelo celular, entre uma tarefa e outra da loja. Momento mais difícil: tirou uma foto rápida da peça nova em cima do balcão, quer o anúncio para postar ainda nesta semana, e não vai ler instrução nenhuma. Se a primeira tela pedir mais que "suba a foto e escolha o tipo de peça", ele desiste. Consequência para o desenho: **mobile-first**, poucas opções por tela, padrões já escolhidos, progresso visível enquanto gera, e ele pode fechar o app e voltar depois.

**Administrador da plataforma (Alexandre).** Cria a marca e o acesso do cliente, lança créditos depois de receber o Pix, acompanha custo real × crédito consumido, ajusta preços em créditos e modelos usados, e investiga gerações que falharam.

---

## 3. Escopo do MVP (= piloto com a Kore Active)

### 3.1 Dentro

1. Login por e-mail e senha; contas criadas pelo administrador (convite).
2. Kit da marca: nome, @ do Instagram, logo, cor de destaque, CTA padrão.
3. Cadastro de produto com 1 a 4 fotos livres + geração da **ficha de produto** (imagem limpa da peça em fundo neutro: frente, costas e detalhe do logo), com aprovação e refação.
4. Criação de anúncio: escolher produto (com ficha aprovada) + opções (seção 11.4).
5. Geração automática de roteiro de 3 cenas pelo Claude, e de 3 quadros-chave (imagem) com a peça vestida por um modelo gerado por IA.
6. Checagem automática de qualidade (QC) de cada quadro antes de mostrar ao usuário.
7. Aprovação e refação de quadro por cena, com instrução em português.
8. Geração dos 3 clipes de vídeo (5 s cada) a partir dos quadros aprovados e montagem do vídeo final de 15 s com texto, CTA e logo sobrepostos.
9. Refação de cena em vídeo, troca para versão anterior da cena e edição de texto/CTA com remontagem gratuita.
10. Formatos vertical 9:16 e horizontal 16:9. Com ou sem texto na tela.
11. Download do MP4 final.
12. Créditos: saldo por marca, consumo por ação com preço visível, extrato. **Compra de pacotes de créditos pela própria plataforma via Stripe Checkout** (cartão internacional), com crédito automático no saldo. O administrador mantém o lançamento manual para bônus, ajustes e pagamentos recebidos por fora.
13. Painel do administrador: marcas, usuários, lançamento de créditos, custo real × créditos, gerações com falha, configuração de preços e modelos.
14. Prompts versionados no repositório, com a versão usada registrada em cada anúncio.

### 3.2 Fora

| Item | Destino | Motivo / dependência |
|---|---|---|
| Modelo falando para a câmera (lip sync, diálogo) | Adiado — v2 | Mais caro e com maior taxa de falha; decisão do usuário em 31/10/2026. Seção 28.1. |
| Narração em off | Adiado — v2 | Não pedido para o piloto. Seção 28.2. |
| Trilha sonora | Adiado — v2 | Licenciamento de música; no piloto o lojista coloca o áudio em alta direto no Instagram (seção 24, A-4). Seção 28.3. |
| Vídeos maiores que 15 s (30 s) | Adiado — v2 | Decisão do usuário: 15 s basta por agora. Seção 28.4. |
| Formato 4:5 (feed) e 1:1 | Adiado — v2 | Validar demanda no piloto. |
| Pix e meios locais brasileiros na compra de créditos | Adiado — v2 | O cliente piloto não mora no Brasil; Pix entra quando houver cliente brasileiro. Seção 28.5. |
| Assinatura recorrente de créditos (cobrança mensal automática) | Adiado — v2 | Piloto valida primeiro o consumo com pacotes avulsos. Seção 28.5. |
| Autocadastro de novas marcas | Adiado — v2 | Depende de validar o piloto. Seção 28.5. |
| Publicação direta no Instagram / Meta Ads | Adiado — v3 | Exige app aprovado na Meta. |
| Notificação por e-mail quando o vídeo fica pronto | Adiado — v2 | Piloto: aviso dentro do app. Seção 28.6. |
| Várias peças no mesmo anúncio (conjunto top + legging de produtos diferentes) | Adiado — v2 | Aumenta muito a complexidade de fidelidade. No MVP, um conjunto pode ser cadastrado como um produto de categoria `conjunto`. |
| Editor de prompt / prompt livre | Descartado | Viola o princípio 5 e o anti-escopo. |
| Escolher a música/efeito de transição | Descartado no MVP | Montagem tem corte seco padrão. |

---

## 4. Arquitetura

### 4.1 Stack

| Camada | Escolha | Por quê | Alternativa descartada |
|---|---|---|---|
| Frontend + rotas de servidor | Next.js (App Router) + TypeScript, deploy na Vercel | Stack que o responsável já usa em produção; rotas de servidor guardam as chaves de API | SPA + backend separado: mais peças para o piloto |
| Banco, auth, storage | Supabase (Postgres + Auth + Storage + RLS) | Mesmo motivo; RLS garante isolamento por marca para quando houver mais clientes | Firebase: sem SQL/RLS equivalente |
| Roteiro, prompts e QC | Claude API, modelo `claude-sonnet-5-5` (visão + saída estruturada via tool use) | Lê imagem (ficha e quadros) e devolve JSON validado; custo por anúncio de centavos | Haiku 5.5: mais barato, mas o roteiro é onde está a qualidade; pode ser usado no QC de texto (configurável) |
| Geração de imagem e vídeo | Higgsfield API (saldo pré-pago em USD, um único key para vários modelos) | Um único fornecedor para edição de imagem com referência e image-to-video; falhas não são cobradas; webhook | Contratar cada modelo direto: o responsável já avaliou e descartou |
| Montagem do vídeo | Worker Node.js + ffmpeg em container (Railway ou Fly.io) | ffmpeg precisa de binário e minutos de CPU que funções serverless não garantem | Remotion Lambda: mais caro e complexo para corte seco + overlay |
| Pagamento | Stripe Checkout (página hospedada, `mode=payment`) + webhook | Cliente piloto fora do Brasil paga com cartão internacional; a Stripe cuida dos dados de cartão (nada de cartão passa pelo nosso servidor) e da moeda | Gateway brasileiro (Mercado Pago/Asaas): forte em Pix, fraco para cliente no exterior; Payment Links: sem vínculo automático com a marca |
| Fila | A própria tabela `anuncios`/`geracoes` no Postgres, com `FOR UPDATE SKIP LOCKED` | Volume do piloto é baixo; sem infraestrutura nova | Fila dedicada (SQS, Inngest): desnecessária agora |

**Repositório:** um monorepo no GitHub com `apps/web` (Next.js), `apps/worker` (montagem) e `supabase/` (migrations). **Projeto de referência:** mesmo padrão Next.js + Supabase + Vercel dos apps web já em produção do responsável.

### 4.2 Modelos de IA (configuráveis pelo administrador, tabela `configuracoes`)

| Uso | Padrão inicial | Observação |
|---|---|---|
| Ficha de produto (edição de imagem com referência) | Modelo de edição de imagem da família Nano Banana disponível na Higgsfield API | **Premissa a validar:** confirmar o endpoint ID exato em `docs.higgsfield.ai/docs/llms.txt` antes de codar |
| Quadro-chave (modelo vestindo a peça) | Mesmo modelo de edição, com a ficha aprovada como referência | Idem |
| Clipe de vídeo (image-to-video, 5 s) | Kling 3.0 image-to-video, 1080p, sem áudio | Alternativa configurável: Seedance 2.5 image-to-video. Confirmar endpoint ID na documentação |
| Roteiro e QC | `claude-sonnet-5-5` | QC de texto pode usar `claude-haiku-5-5` |

Nenhum endpoint ID fica fixo no código: todos vêm de `configuracoes` (seção 7), para trocar de modelo sem deploy.

### 4.3 Integração com a Higgsfield API

- Autenticação por cabeçalho `Authorization: Key <id>:<secret>`, só no servidor.
- Toda geração é assíncrona: a submissão devolve `request_id` e `status_url`. O resultado chega por **webhook** (parâmetro de query `hf_webhook` com a URL `/api/webhooks/higgsfield?token=<HF_WEBHOOK_TOKEN>`), com polling do `status_url` como reserva a cada 30 s para gerações paradas há mais de 3 min.
- O webhook pode ser reenviado: o processamento é **idempotente por `request_id`**.
- Status finais tratados: `completed`, `failed`, `nsfw`.
- Imagens de entrada são passadas como URLs assinadas do Supabase Storage com validade de 60 min. **Premissa a validar:** a API aceita URL assinada externa (não exige upload prévio).
- Resultado (URL temporária da Higgsfield) é **copiado imediatamente** para o Supabase Storage; nunca guardamos só a URL externa.
- Limite de 20 requisições simultâneas por chave: o servidor nunca submete mais de 10 simultâneas no piloto.

### 4.4 Fluxo técnico de um anúncio (visão geral)

```
[usuário] cria anúncio ──► rota /api/anuncios
   └─ debita créditos (gerar_roteiro_quadros)
   └─ Claude: briefing + ficha + kit da marca ──► roteiro JSON (3 cenas)
   └─ Higgsfield: 3 quadros (edição de imagem com ficha como referência)
          └─ webhook ──► copia para Storage ──► Claude QC do quadro
                 └─ reprovado no QC: regenera 1x sem cobrar
[usuário] aprova quadros (ou refaz) ──► /api/anuncios/:id/gerar-video
   └─ debita créditos (gerar_video)
   └─ Higgsfield: 3 clipes image-to-video (5 s)
          └─ webhook ──► copia para Storage
   └─ 3 clipes prontos ──► status 'montando'
[worker] pega anúncio 'montando' ──► ffmpeg: concatena, sobrepõe texto/CTA/logo
   └─ sobe MP4 final ──► status 'pronto'
```

### 4.5 Integração com a Stripe

- Conta Stripe do responsável (entidade a definir — pergunta aberta 25.6). Chaves só no servidor (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
- Cada pacote de créditos (tabela `pacotes_creditos`) aponta para um **Price** da Stripe (`stripe_price_id`), criado no painel da Stripe; a moeda e o valor de verdade vivem na Stripe e são espelhados na tabela para exibição.
- Compra: `POST /api/creditos/checkout` cria uma Checkout Session (`mode=payment`, um item, `client_reference_id = marca_id`, `metadata = { pagamento_id, marca_id, pacote_id }`, `success_url = /creditos/obrigado?session_id={CHECKOUT_SESSION_ID}`, `cancel_url = /creditos`) e redireciona o usuário para a página hospedada da Stripe.
- Crédito no saldo: função de servidor `fulfillCheckout(sessionId)` — busca a sessão na Stripe com `line_items` expandido, confere `payment_status = 'paid'`, e chama `creditar_pagamento` (seção 7.5), que é **idempotente por `stripe_checkout_session_id`**. É chamada pelo webhook `checkout.session.completed` (e `checkout.session.async_payment_succeeded`) e também pela página `/creditos/obrigado`, para o saldo aparecer na hora mesmo se o webhook atrasar. O webhook é obrigatório; a página é atalho.
- Webhook: `POST /api/webhooks/stripe`, assinatura verificada com `STRIPE_WEBHOOK_SECRET` sobre o corpo bruto; responde 2xx rápido. Eventos tratados: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`.
- Reembolso feito no painel da Stripe (`charge.refunded`) gera `ajuste_manual` negativo automático do mesmo número de créditos, limitado ao saldo disponível; o que não puder ser debitado fica registrado em `pagamentos.observacao` e aparece como alerta no admin.
- Recibo: o recibo por e-mail da própria Stripe (ativar no painel). Sem emissão de nota fiscal pela plataforma no MVP (pergunta aberta 25.7).
- Teste: modo de teste da Stripe com cartão `4242 4242 4242 4242` e `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

---

## 5. Perfis de usuário e matriz de permissões

Perfis:
- **`admin_plataforma`** — Alexandre. Vê e opera todas as marcas.
- **`usuario_marca`** — dono ou funcionário de uma marca. Vê e opera só a própria marca. No piloto, todos os usuários de uma marca têm as mesmas permissões (seção 24, A-6).

| Ação | `usuario_marca` | `admin_plataforma` |
|---|---|---|
| Criar marca | ❌ | ✅ qualquer |
| Editar kit da marca (logo, cor, CTA, @) | ✅ só a própria marca | ✅ qualquer marca |
| Criar conta de usuário | ❌ | ✅ em qualquer marca |
| Desativar usuário | ❌ | ✅ qualquer |
| Promover a administrador | ❌ | ❌ pela interface (só via seed/SQL — seção 6.2) |
| Criar/editar/arquivar produto | ✅ só da própria marca | ✅ qualquer |
| Gerar/refazer/aprovar ficha de produto | ✅ só da própria marca, com saldo | ✅ qualquer marca, consumindo crédito da marca |
| Criar anúncio, refazer, aprovar, gerar vídeo | ✅ só da própria marca, com saldo | ✅ qualquer marca, consumindo crédito da marca |
| Editar texto/CTA e remontar | ✅ só da própria marca | ✅ qualquer |
| Baixar vídeo | ✅ só da própria marca | ✅ qualquer |
| Arquivar anúncio | ✅ só da própria marca | ✅ qualquer |
| Ver saldo e extrato de créditos | ✅ só da própria marca | ✅ qualquer |
| Comprar pacote de créditos (Stripe) | ✅ só para a própria marca | ✅ não compra; lança manualmente |
| Ver histórico de pagamentos | ✅ só da própria marca | ✅ qualquer |
| Lançar compra manual/bônus/ajuste de créditos | ❌ | ✅ qualquer marca |
| Criar/editar/desativar pacotes de créditos | ❌ | ✅ |
| Ver custo real em USD e margem | ❌ (nunca exibido) | ✅ |
| Ver prompts, modelo usado, payload de geração | ❌ (nunca exibido) | ✅ |
| Editar preços em créditos e modelos padrão | ❌ | ✅ |
| Excluir definitivamente qualquer dado | ❌ | ❌ pela interface (seção 7.4) |

**Primeiro administrador:** criado no seed (seção 7.6) a partir das variáveis `SEED_ADMIN_EMAIL` e `SEED_ADMIN_SENHA`, com `papel = 'admin_plataforma'` e `marca_id = null`.

**Escopo por marca:** definido por `perfis.marca_id`. `usuario_marca` com `marca_id` nulo é estado inválido (impedido por constraint `perfis_marca_obrigatoria_chk`).

---

## 6. Autenticação e identidade

### 6.1 Identificação e criação de conta
- Identificador: **e-mail**, com senha (Supabase Auth). Sem login social no piloto.
- **Sem autocadastro.** Contas criadas pelo administrador na tela `[Admin] Usuários`, via rota de servidor `POST /api/admin/usuarios`, que usa a credencial privilegiada do Supabase (só no servidor) para chamar `auth.admin.inviteUserByEmail`. O convidado recebe e-mail do Supabase, define a senha e entra.
- Ao criar, a rota insere a linha em `perfis` com `marca_id` e `papel = 'usuario_marca'`.

### 6.2 Primeiro acesso, senha, recuperação
- Primeiro acesso: o link do convite leva à tela de definir senha (mínimo 8 caracteres).
- **Recuperação de senha:** fluxo padrão do Supabase ("esqueci minha senha" → e-mail com link). Configurar no Supabase o template de e-mail em português e a URL de redirecionamento `/redefinir-senha`.
- Administrador nunca vê nem define senha de usuário.
- Promoção a `admin_plataforma` só por SQL manual no banco (operação rara, registrada).

### 6.3 Sessão
- Sessão do Supabase com renovação automática; logout em menu do perfil.
- Usuário com `perfis.ativo = false` é deslogado no próximo request e vê "Seu acesso foi desativado. Fale com o suporte." (o middleware confere `ativo`).
- Marca com `marcas.ativa = false`: usuários da marca entram, veem o histórico e baixam vídeos, mas todas as ações que consomem crédito ficam bloqueadas com a mensagem "Conta pausada. Fale com o suporte."

### 6.4 Autorização no banco (RLS)

Funções auxiliares (seção 7.5): `eh_admin()` e `minha_marca_id()`.

| Tabela | Leitura | Escrita direta pelo cliente | Nome previsto das políticas |
|---|---|---|---|
| `marcas` | própria marca ou admin | update de `nome`, `instagram`, `logo_path`, `cor_destaque`, `cta_padrao`, `tom_de_voz` na própria marca; admin tudo exceto `saldo_creditos` | `marcas_select`, `marcas_update_kit` |
| `perfis` | o próprio perfil e os da mesma marca; admin todos | nenhuma (só servidor) | `perfis_select` |
| `produtos` | própria marca; admin todos | insert/update na própria marca | `produtos_select`, `produtos_insert`, `produtos_update` |
| `fotos_produto` | própria marca; admin | insert/delete na própria marca, só enquanto o produto não tem ficha aprovada | `fotos_select`, `fotos_insert`, `fotos_delete` |
| `fichas_produto` | própria marca; admin | nenhuma (só servidor) | `fichas_select` |
| `anuncios` | própria marca; admin | update só de `titulo` e `arquivado` | `anuncios_select`, `anuncios_update_basico` |
| `cenas` | própria marca; admin | nenhuma (texto passa pela rota de remontagem) | `cenas_select` |
| `quadros`, `clipes` | própria marca; admin | nenhuma | `quadros_select`, `clipes_select` |
| `geracoes` | só admin | nenhuma | `geracoes_select_admin` |
| `movimentacoes_creditos` | própria marca (sem `valor_pago_centavos` exposto na UI do cliente); admin todos | nenhuma | `movimentacoes_select` |
| `precos_acoes` | todos autenticados | nenhuma (admin via servidor) | `precos_select` |
| `pacotes_creditos` | todos autenticados (só `ativo = true` para `usuario_marca`); admin todos | nenhuma (admin via servidor) | `pacotes_select` |
| `pagamentos` | própria marca; admin todos | nenhuma (só servidor/webhook) | `pagamentos_select` |
| `configuracoes` | só admin | nenhuma (admin via servidor) | `configuracoes_select_admin` |

**Storage:** buckets privados `marcas`, `produtos`, `anuncios`. Todo caminho começa com `<marca_id>/`. Política de leitura e escrita: o primeiro segmento do caminho é igual a `minha_marca_id()`, ou `eh_admin()`. Escrita do cliente permitida só em `marcas/<marca_id>/logo/*` e `produtos/<marca_id>/<produto_id>/originais/*`. Tudo o mais é gravado pelo servidor. Leitura pela interface por URL assinada (validade 60 min).

---

## 7. Modelo de dados

Convenção: tabelas, colunas, enums, funções, triggers e políticas em **português**, `snake_case`. Todas as tabelas têm `id uuid` com `default gen_random_uuid()` (exceto `perfis`, `precos_acoes` e `configuracoes`) e `criado_em timestamptz not null default now()`.

### 7.1 Diagrama de relacionamento

```
marcas 1──N perfis
marcas 1──N produtos 1──N fotos_produto
                   1──N fichas_produto
produtos 1──N anuncios 1──N cenas (exatamente 3) 1──N quadros
                                              1──N clipes
fichas_produto 1──N anuncios (ficha usada no anúncio)
marcas 1──N geracoes ──1 quadros / clipes / fichas_produto (cada item gerado aponta para a geração)
marcas 1──N movimentacoes_creditos
marcas 1──N pagamentos N──1 pacotes_creditos
pagamentos 1──0..1 movimentacoes_creditos (crédito da compra)
```

### 7.2 Enums

| Enum | Valores (nesta ordem) |
|---|---|
| `papel_usuario` | `admin_plataforma`, `usuario_marca` |
| `categoria_peca` | `top`, `legging`, `shorts`, `camiseta`, `regata`, `jaqueta`, `conjunto`, `outro` |
| `genero_alvo` | `feminino`, `masculino`, `unissex` |
| `status_ficha` | `gerando`, `aguardando_aprovacao`, `aprovada`, `descartada`, `falhou` |
| `status_anuncio` | `gerando_roteiro`, `gerando_quadros`, `aguardando_aprovacao`, `gerando_clipes`, `montando`, `pronto`, `falhou` |
| `status_item` | `gerando`, `pronto`, `descartado`, `falhou` |
| `status_geracao` | `na_fila`, `processando`, `concluida`, `falhou`, `bloqueada_nsfw` |
| `tipo_geracao` | `ficha_produto`, `quadro_chave`, `clipe_video` |
| `cenario` | `academia`, `box_crossfit`, `estudio_funcional`, `ao_ar_livre_urbano`, `ao_ar_livre_natureza`, `pista_de_corrida` |
| `modalidade` | `musculacao`, `crossfit`, `hyrox`, `corrida`, `funcional`, `yoga_pilates` |
| `genero_modelo` | `mulher`, `homem` |
| `faixa_etaria` | `de_20_a_30`, `de_30_a_45`, `acima_de_45` |
| `estilo_video` | `energetico`, `cinematografico`, `lifestyle` |
| `formato_video` | `vertical_9_16`, `horizontal_16_9` |
| `tipo_movimentacao` | `compra`, `bonus`, `consumo`, `estorno`, `ajuste_manual` |
| `acao_cobravel` | `gerar_ficha`, `refazer_ficha`, `gerar_roteiro_quadros`, `refazer_quadro`, `gerar_video`, `refazer_clipe`, `remontar_texto` |
| `status_pagamento` | `iniciado`, `pago`, `falhou`, `expirado`, `reembolsado` |

### 7.3 Tabelas

#### `marcas`
| Coluna | Tipo | Nulo | Default | Observação |
|---|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` | pk |
| nome | text | não | — | |
| instagram | text | sim | — | handle sem `@`; nulo se a marca não informou. Check `^[A-Za-z0-9._]{1,30}$` |
| logo_path | text | sim | — | caminho no bucket `marcas`; nulo até o upload do logo. Sem logo, o fecho do vídeo mostra só o nome da marca |
| cor_destaque | text | sim | — | hex `^#[0-9A-Fa-f]{6}$`; nulo usa branco no texto do vídeo |
| cta_padrao | text | não | `'Compre pelo link da bio'` | máx. 40 caracteres |
| tom_de_voz | text | sim | — | frase livre usada pelo Claude no texto da tela (ex.: "motivacional, direto, sem gírias"); nulo usa tom neutro-energético |
| saldo_creditos | integer | não | `0` | check `>= 0`; só alterado pelas funções da seção 7.5 |
| ativa | boolean | não | `true` | |
| criado_em | timestamptz | não | `now()` | |
| atualizado_em | timestamptz | não | `now()` | trigger `trg_marcas_atualizado_em` |

#### `perfis`
| Coluna | Tipo | Nulo | Default | Observação |
|---|---|---|---|---|
| id | uuid | não | — | pk; fk `auth.users.id` |
| marca_id | uuid | sim | — | fk `marcas.id`; nulo **somente** para `admin_plataforma` (check `perfis_marca_obrigatoria_chk`: `papel = 'admin_plataforma' or marca_id is not null`) |
| papel | papel_usuario | não | `'usuario_marca'` | |
| nome | text | não | — | |
| email | text | não | — | unique; cópia do e-mail do auth para listagem |
| ativo | boolean | não | `true` | |
| criado_em | timestamptz | não | `now()` | |

#### `produtos`
| Coluna | Tipo | Nulo | Default | Observação |
|---|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` | pk |
| marca_id | uuid | não | — | fk `marcas.id` |
| nome | text | não | — | ex.: "Top Kore Preto" |
| categoria | categoria_peca | não | — | |
| genero_alvo | genero_alvo | não | `'unissex'` | sugere o `genero_modelo` padrão no anúncio |
| descricao | text | sim | — | texto livre do lojista (tecido, diferenciais); nulo se não informado |
| ficha_aprovada_id | uuid | sim | — | fk `fichas_produto.id`; nulo até a primeira ficha ser aprovada. Produto sem ficha aprovada não pode ter anúncio |
| arquivado | boolean | não | `false` | soft delete |
| criado_em | timestamptz | não | `now()` | |
| atualizado_em | timestamptz | não | `now()` | trigger `trg_produtos_atualizado_em` |

#### `fotos_produto`
| Coluna | Tipo | Nulo | Default | Observação |
|---|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` | pk |
| produto_id | uuid | não | — | fk `produtos.id` |
| marca_id | uuid | não | — | fk `marcas.id`; desnormalizado para RLS |
| storage_path | text | não | — | `produtos/<marca_id>/<produto_id>/originais/<arquivo>` |
| ordem | smallint | não | `1` | check `ordem between 1 and 4` |
| criado_em | timestamptz | não | `now()` | |

Máximo 4 fotos por produto (trigger `trg_fotos_produto_limite`).

#### `fichas_produto`
| Coluna | Tipo | Nulo | Default | Observação |
|---|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` | pk |
| produto_id | uuid | não | — | fk `produtos.id` |
| marca_id | uuid | não | — | fk `marcas.id` |
| versao | integer | não | — | 1, 2, 3… por produto; unique (`produto_id`, `versao`) |
| status | status_ficha | não | `'gerando'` | |
| imagem_path | text | sim | — | nulo enquanto `gerando` ou se `falhou` |
| geracao_id | uuid | sim | — | fk `geracoes.id`; nulo só no instante entre criar a linha e submeter |
| instrucao_refacao | text | sim | — | o que o usuário pediu para mudar; nulo na versão 1 |
| criado_em | timestamptz | não | `now()` | |

#### `anuncios`
| Coluna | Tipo | Nulo | Default | Observação |
|---|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` | pk |
| marca_id | uuid | não | — | fk `marcas.id` |
| produto_id | uuid | não | — | fk `produtos.id` |
| ficha_id | uuid | não | — | fk `fichas_produto.id`; a ficha aprovada no momento da criação (congelada) |
| criado_por | uuid | não | — | fk `perfis.id` |
| titulo | text | não | — | gerado ("Top Kore Preto · Academia · 9:16"), editável |
| cenario | cenario | não | — | |
| modalidade | modalidade | não | — | |
| genero_modelo | genero_modelo | não | — | |
| faixa_etaria | faixa_etaria | não | `'de_20_a_30'` | |
| estilo | estilo_video | não | `'energetico'` | |
| formato | formato_video | não | `'vertical_9_16'` | |
| com_texto | boolean | não | `true` | se `false`, o vídeo sai sem texto na tela, mas mantém o fecho com logo |
| texto_oferta | text | sim | — | ex.: "20% OFF esta semana"; nulo = sem oferta. Máx. 40 caracteres |
| observacoes | text | sim | — | pedido livre do usuário (ex.: "modelo de cabelo cacheado"); nulo se vazio |
| status | status_anuncio | não | `'gerando_roteiro'` | seção 12.2 |
| roteiro | jsonb | sim | — | saída do Claude (Anexo C.2); nulo até o roteiro ser gerado |
| prompt_versao | text | sim | — | ex.: `roteiro.v1+quadro.v1`; nulo até o roteiro |
| video_final_path | text | sim | — | caminho do MP4 da montagem mais recente; nulo até a primeira montagem |
| versao_montagem | integer | não | `0` | incrementa a cada montagem |
| erro | text | sim | — | última mensagem de erro para o admin; nulo se nunca falhou |
| arquivado | boolean | não | `false` | soft delete |
| criado_em | timestamptz | não | `now()` | |
| atualizado_em | timestamptz | não | `now()` | trigger `trg_anuncios_atualizado_em` |

#### `cenas`
| Coluna | Tipo | Nulo | Default | Observação |
|---|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` | pk |
| anuncio_id | uuid | não | — | fk `anuncios.id` |
| marca_id | uuid | não | — | fk `marcas.id` |
| ordem | smallint | não | — | check `ordem between 1 and 3`; unique (`anuncio_id`, `ordem`) |
| descricao | text | não | — | descrição em português para o usuário ("Close no peito durante o levantamento") |
| prompt_quadro | text | não | — | prompt de imagem (inglês), nunca exibido ao usuário |
| prompt_movimento | text | não | — | prompt de image-to-video (inglês), nunca exibido |
| texto_tela | text | sim | — | texto sobreposto na cena; nulo = cena sem texto. Máx. 32 caracteres por linha, 2 linhas |
| quadro_atual_id | uuid | sim | — | fk `quadros.id`; versão de quadro escolhida; nulo enquanto nenhum quadro está pronto |
| clipe_atual_id | uuid | sim | — | fk `clipes.id`; versão de clipe usada na montagem; nulo antes do vídeo |
| criado_em | timestamptz | não | `now()` | |

#### `quadros`
| Coluna | Tipo | Nulo | Default | Observação |
|---|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` | pk |
| cena_id | uuid | não | — | fk `cenas.id` |
| marca_id | uuid | não | — | fk `marcas.id` |
| versao | integer | não | — | unique (`cena_id`, `versao`) |
| status | status_item | não | `'gerando'` | |
| imagem_path | text | sim | — | nulo enquanto `gerando`/`falhou` |
| geracao_id | uuid | sim | — | fk `geracoes.id` |
| instrucao_refacao | text | sim | — | nulo na versão 1 e nas regenerações automáticas |
| qc_aprovado | boolean | sim | — | resultado do QC (regra 11.5); nulo até o QC rodar |
| qc_detalhe | jsonb | sim | — | resposta estruturada do QC (Anexo C.4) |
| criado_em | timestamptz | não | `now()` | |

#### `clipes`
| Coluna | Tipo | Nulo | Default | Observação |
|---|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` | pk |
| cena_id | uuid | não | — | fk `cenas.id` |
| marca_id | uuid | não | — | fk `marcas.id` |
| quadro_id | uuid | não | — | fk `quadros.id`; quadro que originou o clipe |
| versao | integer | não | — | unique (`cena_id`, `versao`) |
| status | status_item | não | `'gerando'` | |
| video_path | text | sim | — | nulo enquanto `gerando`/`falhou` |
| geracao_id | uuid | sim | — | fk `geracoes.id` |
| instrucao_refacao | text | sim | — | nulo na versão 1 |
| criado_em | timestamptz | não | `now()` | |

#### `geracoes`
Uma linha por chamada à Higgsfield API. Visível só para o admin.

| Coluna | Tipo | Nulo | Default | Observação |
|---|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` | pk |
| marca_id | uuid | não | — | fk `marcas.id` |
| tipo | tipo_geracao | não | — | |
| modelo | text | não | — | endpoint ID usado (ex.: `kling-video/...`) |
| request_id | text | sim | — | unique; nulo até a submissão ser aceita |
| status | status_geracao | não | `'na_fila'` | |
| entrada | jsonb | não | — | payload enviado (URLs assinadas removidas antes de salvar) |
| resultado_url | text | sim | — | URL temporária devolvida; nulo até concluir |
| custo_usd | numeric(10,4) | sim | — | custo calculado (segundos × preço configurado, ou preço por imagem); nulo se falhou (não cobrado) |
| tentativa | smallint | não | `1` | 2 = retentativa automática |
| erro | text | sim | — | nulo se não falhou |
| cobranca_id | uuid | sim | — | fk `movimentacoes_creditos.id` do débito que pagou esta geração; nulo em retentativas automáticas e regenerações de QC (não cobradas) |
| criado_em | timestamptz | não | `now()` | |
| concluido_em | timestamptz | sim | — | nulo até estado final |

#### `movimentacoes_creditos`
Livro-razão imutável (append-only). O saldo em `marcas.saldo_creditos` é sempre igual à soma de `quantidade` da marca.

| Coluna | Tipo | Nulo | Default | Observação |
|---|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` | pk |
| marca_id | uuid | não | — | fk `marcas.id` |
| tipo | tipo_movimentacao | não | — | |
| quantidade | integer | não | — | positiva (compra, bônus, estorno, ajuste a favor) ou negativa (consumo, ajuste contra); check `<> 0` |
| saldo_apos | integer | não | — | saldo da marca logo após esta movimentação |
| acao | acao_cobravel | sim | — | preenchida em `consumo` e `estorno`; nula nos demais tipos |
| referencia_tipo | text | sim | — | `ficha`, `anuncio`, `quadro`, `clipe`; nula em compra/bônus/ajuste |
| referencia_id | uuid | sim | — | id do item; nulo em compra/bônus/ajuste |
| estorno_de_id | uuid | sim | — | fk `movimentacoes_creditos.id`; preenchido só em `estorno` |
| valor_pago_centavos | integer | sim | — | valor recebido, em centavos da `moeda`; só em `compra` |
| moeda | text | sim | — | código ISO 4217 em minúsculas (`usd`, `eur`, `brl`); obrigatório quando `valor_pago_centavos` não é nulo (check) |
| pagamento_id | uuid | sim | — | fk `pagamentos.id`; preenchido só na `compra` creditada pela Stripe; unique (uma compra credita uma vez) |
| observacao | text | sim | — | obrigatório em `ajuste_manual` e `bonus` (check) |
| criado_por | uuid | sim | — | fk `perfis.id`; nulo quando gerado pelo sistema |
| criado_em | timestamptz | não | `now()` | |

#### `pacotes_creditos`
Pacotes à venda. Editados pelo admin; o valor cobrado de fato é o do Price na Stripe.

| Coluna | Tipo | Nulo | Default | Observação |
|---|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` | pk |
| nome | text | não | — | ex.: "Pacote 50" |
| creditos | integer | não | — | check `> 0` |
| preco_centavos | integer | não | — | espelho do Price da Stripe, para exibir; check `> 0` |
| moeda | text | não | — | ISO 4217 minúsculas; check `^[a-z]{3}$` |
| stripe_price_id | text | não | — | unique; `price_...` |
| ativo | boolean | não | `true` | inativo some da tela de compra |
| ordem | smallint | não | `1` | ordem de exibição |
| criado_em | timestamptz | não | `now()` | |
| atualizado_em | timestamptz | não | `now()` | trigger `trg_pacotes_creditos_atualizado_em` |

#### `pagamentos`
Uma linha por Checkout Session criada. Nunca excluída.

| Coluna | Tipo | Nulo | Default | Observação |
|---|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` | pk |
| marca_id | uuid | não | — | fk `marcas.id` |
| pacote_id | uuid | não | — | fk `pacotes_creditos.id` |
| criado_por | uuid | não | — | fk `perfis.id` |
| creditos | integer | não | — | créditos do pacote no momento da compra (congelado) |
| valor_centavos | integer | não | — | valor do pacote no momento da compra; atualizado com `amount_total` da Stripe ao pagar |
| moeda | text | não | — | ISO 4217 minúsculas |
| status | status_pagamento | não | `'iniciado'` | seção 12.5 |
| stripe_checkout_session_id | text | sim | — | unique; nulo só no instante entre criar a linha e criar a sessão |
| stripe_payment_intent_id | text | sim | — | nulo até pagar |
| pago_em | timestamptz | sim | — | nulo até `pago` |
| observacao | text | sim | — | alertas (ex.: reembolso maior que o saldo); nulo normalmente |
| criado_em | timestamptz | não | `now()` | |
| atualizado_em | timestamptz | não | `now()` | trigger `trg_pagamentos_atualizado_em` |

#### `precos_acoes`
| Coluna | Tipo | Nulo | Default | Observação |
|---|---|---|---|---|
| acao | acao_cobravel | não | — | pk |
| creditos | integer | não | — | check `>= 0` |
| descricao | text | não | — | texto exibido no botão/extrato |
| atualizado_em | timestamptz | não | `now()` | |

#### `configuracoes`
| Coluna | Tipo | Nulo | Default | Observação |
|---|---|---|---|---|
| chave | text | não | — | pk |
| valor | jsonb | não | — | |
| descricao | text | não | — | |
| atualizado_em | timestamptz | não | `now()` | |

### 7.4 Estratégia de exclusão
- `produtos`, `anuncios`: **soft delete** (`arquivado`). Arquivado some das listas do usuário; o admin ainda vê.
- `fotos_produto`: hard delete permitido enquanto o produto não tem ficha aprovada (a foto ainda não foi usada).
- `fichas_produto`, `quadros`, `clipes`, `cenas`, `geracoes`, `movimentacoes_creditos`: **nunca excluídos** (histórico e custo). Versões rejeitadas ficam com status `descartada`/`descartado`.
- `marcas`, `perfis`: desativação (`ativa`, `ativo`), nunca exclusão.
- `pacotes_creditos`: desativação (`ativo`), nunca exclusão. `pagamentos`: nunca excluídos.
- Pedido de exclusão de dados (LGPD) é atendido manualmente pelo admin (seção 20).

### 7.5 Lógica no banco

| Nome | Tipo | Tabela | O que faz |
|---|---|---|---|
| `eh_admin()` | função `stable security definer` | `perfis` | Devolve `true` se o usuário logado é `admin_plataforma` e `ativo`. Usada nas políticas |
| `minha_marca_id()` | função `stable security definer` | `perfis` | Devolve `marca_id` do usuário logado (nulo para admin) |
| `debitar_creditos(p_marca_id, p_acao, p_quantidade_itens, p_referencia_tipo, p_referencia_id, p_criado_por)` | função `security definer`, executável só por `service_role` | `marcas`, `movimentacoes_creditos`, `precos_acoes` | Trava a linha da marca (`for update`), calcula `creditos × p_quantidade_itens` de `precos_acoes`, levanta erro `saldo_insuficiente` se o saldo não cobre, levanta `marca_inativa` se `ativa = false`, insere `consumo` com quantidade negativa, atualiza o saldo. Devolve o id da movimentação. Se o preço da ação for 0, não insere nada e devolve nulo |
| `estornar_creditos(p_movimentacao_id, p_observacao)` | função `security definer`, só `service_role` | idem | Insere `estorno` positivo igual ao valor do consumo original, com `estorno_de_id`. Levanta erro se aquele consumo já foi estornado (idempotente) |
| `lancar_creditos(p_marca_id, p_tipo, p_quantidade, p_valor_pago_centavos, p_observacao, p_criado_por)` | função `security definer`, só `service_role` | idem | Para `compra`, `bonus`, `ajuste_manual`. Valida as regras de 11.2. Atualiza o saldo. Ajuste negativo não pode deixar saldo < 0 |
| `creditar_pagamento(p_pagamento_id, p_stripe_payment_intent_id, p_valor_centavos, p_moeda)` | função `security definer`, só `service_role` | `pagamentos`, `movimentacoes_creditos`, `marcas` | Trava a linha do pagamento; se já está `pago`, devolve o id da movimentação existente sem fazer nada (idempotente); senão marca `pago`, grava `pago_em`, insere `compra` com `creditos` do pagamento, `valor_pago_centavos`, `moeda` e `pagamento_id`, e atualiza o saldo |
| `estornar_pagamento(p_pagamento_id)` | função `security definer`, só `service_role` | idem | Para `charge.refunded`: marca `reembolsado` e insere `ajuste_manual` negativo de até `min(creditos, saldo)`; registra a diferença em `observacao`. Idempotente |
| `pegar_proximo_anuncio_para_montar()` | função `security definer`, só `service_role` | `anuncios` | Seleciona 1 anúncio com `status = 'montando'` e sem montagem em andamento (`for update skip locked`), marca `erro = null` e devolve id. Usada pelo worker |
| `trg_movimentacoes_imutaveis` | trigger `before update or delete` | `movimentacoes_creditos` | Levanta erro: livro-razão é append-only |
| `trg_fotos_produto_limite` | trigger `before insert` | `fotos_produto` | Bloqueia a 5ª foto do produto |
| `trg_marcas_atualizado_em`, `trg_produtos_atualizado_em`, `trg_anuncios_atualizado_em`, `trg_pacotes_creditos_atualizado_em`, `trg_pagamentos_atualizado_em` | trigger `before update` | respectivas | Atualiza `atualizado_em` (função comum `definir_atualizado_em()`) |
| `trg_marcas_proteger_saldo` | trigger `before update` | `marcas` | Se `saldo_creditos` mudou e a sessão não é das funções de crédito (variável de sessão `app.alterando_saldo = 'sim'` setada por elas), levanta erro |

### 7.6 Seed e migrations
- Migrations em `supabase/migrations/`, numeradas por timestamp, aplicadas com `supabase db push`. **Migration já versionada nunca é editada** (hook, seção 18.1).
- Seed (`supabase/seed.sql` + script `scripts/seed-admin.ts`):
  - administrador a partir de `SEED_ADMIN_EMAIL`/`SEED_ADMIN_SENHA`;
  - `precos_acoes` com os valores da regra 11.1;
  - `configuracoes` com as chaves da regra 11.6;
  - `pacotes_creditos` com os pacotes da regra 11.2.9 — o `stripe_price_id` vem das variáveis `SEED_STRIPE_PRICE_PACOTE_50` e `SEED_STRIPE_PRICE_PACOTE_120` (Prices criados antes no painel da Stripe, em modo de teste);
  - marca "Kore Active" (`instagram = 'kore_active'`), sem saldo.

### 7.7 Trade-offs declarados
- `marca_id` desnormalizado em `fotos_produto`, `fichas_produto`, `cenas`, `quadros`, `clipes`: simplifica RLS (uma comparação por linha, sem join). Custo: precisa ser coerente com o pai — garantido porque só o servidor insere essas linhas, sempre copiando do pai.
- Saldo guardado em `marcas.saldo_creditos` e também derivável do livro-razão: leitura rápida e trava simples. A consistência é verificada por teste (seção 22).
- Sempre 3 cenas por anúncio (regra 11.3): simplifica UI, montagem e preço. Vídeo de 30 s (v2) virá com 6 cenas, exigindo rever o check de `ordem`.

---

## 8. Épicos e critérios de aceite

Ordem de implementação: 0 → 1 → 2 → 9 → 3 → 4 → 5 → 6 → 7 → 8. A compra (8.9) vem logo após o painel de créditos do admin, para o piloto já começar comprando pela plataforma.

### 8.0 Guardrails e esqueleto
**Objetivo:** repositório, guardrails do Anexo B, projeto Supabase, deploy vazio funcionando.
- [ ] Arquivos do Anexo B criados, scripts executáveis, cada hook testado uma vez provocando a violação (saída colada).
- [ ] `npm run verify` roda typecheck, lint, testes e build e termina com código 0.
- [ ] App publicado na Vercel com página de login respondendo 200.

### 8.1 Banco, autenticação e permissões
**Objetivo:** schema completo da seção 7, RLS da seção 6.4, seed, login.
**Fluxo:** admin roda seed → entra com e-mail/senha → vê painel admin vazio. Usuário convidado → define senha → entra → vê Início da marca.
- [ ] Todas as tabelas, enums, funções, triggers e políticas da seção 7 e 6.4 existem com os nomes exatos.
- [ ] Teste de RLS: usuário da marca A não lê nenhuma linha da marca B em nenhuma tabela (um teste por tabela).
- [ ] Teste: `usuario_marca` não consegue dar update em `marcas.saldo_creditos` (erro).
- [ ] Teste: update e delete em `movimentacoes_creditos` falham.
- [ ] Usuário com `ativo = false` é deslogado e vê a mensagem da seção 15.
- [ ] Advisors de segurança e performance do Supabase sem alerta crítico.

### 8.2 Painel do administrador: marcas, usuários e créditos
**Fluxo:** admin cria marca → convida usuário → recebe Pix fora do sistema → lança compra com quantidade e valor pago.
- [ ] Criar marca com nome e @; editar todos os campos do kit.
- [ ] Convidar usuário: e-mail de convite enviado; perfil criado com `marca_id` correto.
- [ ] Lançar `compra` exige `valor_pago_centavos > 0`; `bonus` e `ajuste_manual` exigem observação.
- [ ] Após lançar 100 créditos, o saldo da marca é 100 e o extrato mostra a linha com `saldo_apos = 100`.
- [ ] Ajuste negativo que deixaria saldo < 0 é recusado com a mensagem da seção 15.
- [ ] Desativar usuário e pausar marca funcionam conforme 6.3.

### 8.3 Kit da marca e produtos
**Fluxo:** usuário abre Marca → sobe logo (PNG/SVG/JPG, até 5 MB), escolhe cor e CTA → Produtos → Novo produto → nome, categoria, gênero → sobe 1 a 4 fotos.
- [ ] Estados vazio (sem produtos), carregando (upload com progresso) e erro (arquivo > 10 MB ou formato não suportado) implementados com a copy da seção 15.
- [ ] Fotos aceitas: JPG, PNG, HEIC, WEBP até 10 MB cada; HEIC convertido para JPG no servidor.
- [ ] Não é possível subir a 5ª foto.
- [ ] Produto aparece na lista com selo "Sem ficha".

### 8.4 Ficha de produto
**Fluxo:** no produto, botão "Gerar ficha · 2 créditos" → tela de progresso → ficha aparece (imagem com frente, costas e detalhe do logo, fundo neutro) → "Aprovar ficha" ou "Refazer · 1 crédito" com campo "O que está diferente da peça real?".
- [ ] Botão desabilitado com "Saldo insuficiente" quando saldo < preço.
- [ ] Gerar ficha debita exatamente o preço de `gerar_ficha` e cria `fichas_produto` versão 1 com status `gerando`.
- [ ] Ficha pronta em até 3 minutos no p90 (medido no piloto) e exibida sem recarregar a página (Realtime ou polling de 5 s).
- [ ] Falha técnica da Higgsfield: uma retentativa automática sem cobrança; se falhar de novo, status `falhou`, estorno automático e mensagem da seção 15.
- [ ] Refazer cria nova versão com `instrucao_refacao`; a anterior vira `descartada` só quando a nova for aprovada.
- [ ] Aprovar define `produtos.ficha_aprovada_id`. Produto passa a mostrar selo "Pronto para anúncio".
- [ ] Usuário pode voltar para uma versão anterior da ficha e aprová-la (sem custo).

### 8.5 Criar anúncio: roteiro e quadros-chave
**Fluxo:** "Novo anúncio" → passo 1: escolher produto (só com ficha aprovada) → passo 2: onde (cenário) e esporte (modalidade) → passo 3: modelo (mulher/homem, faixa etária, observação opcional) → passo 4: estilo, formato, com/sem texto, oferta opcional → resumo com custo "Criar anúncio · 2 créditos" → tela do anúncio mostrando progresso → 3 cartões de cena com quadro, descrição e texto da tela.
- [ ] Opções padrão pré-selecionadas: `genero_modelo` derivado de `genero_alvo` (feminino→mulher, masculino→homem, unissex→mulher), faixa `de_20_a_30`, estilo `energetico`, formato `vertical_9_16`, com texto.
- [ ] Débito de `gerar_roteiro_quadros` antes de chamar o Claude; falha no Claude após 2 tentativas → anúncio `falhou` e estorno.
- [ ] Roteiro salvo em `anuncios.roteiro` e validado contra o schema do Anexo C.2; resposta fora do schema conta como falha e é retentada.
- [ ] 3 cenas criadas (ordem 1, 2, 3) e 3 quadros submetidos em paralelo.
- [ ] Cada quadro passa pelo QC (regra 11.5); reprovado é regenerado 1 vez automaticamente sem cobrança; se reprovar de novo, é exibido mesmo assim com aviso "Pode não estar fiel à peça — sugerimos refazer".
- [ ] Quando os 3 quadros estão `pronto`, status vai a `aguardando_aprovacao`.
- [ ] Texto da tela de cada cena é editável aqui (validação de tamanho da regra 11.7).

### 8.6 Refação de quadro e geração do vídeo
**Fluxo:** em cada cena, "Refazer imagem · 1 crédito" abre campo de instrução (opcional) → nova versão aparece ao lado, com miniaturas "Versão 1", "Versão 2"… e botão "Usar esta" → com as 3 cenas escolhidas, "Gerar vídeo · 12 créditos" → progresso por cena → montagem → vídeo final em player.
- [ ] Refação usa a instrução do usuário traduzida pelo Claude em ajuste do `prompt_quadro` (Anexo C.3), mantendo a ficha como referência.
- [ ] "Gerar vídeo" só habilita com as 3 cenas com `quadro_atual_id` pronto.
- [ ] Débito de `gerar_video` uma vez para as 3 cenas; 3 clipes submetidos com duração 5 s e formato do anúncio.
- [ ] Clipe que falha tecnicamente: 1 retentativa automática; se falhar de novo, só aquela cena é estornada proporcionalmente (regra 11.2.4) e o usuário vê "Não conseguimos animar a cena X" com botão "Tentar de novo · 4 créditos".
- [ ] Com os 3 clipes `pronto`, status `montando`; worker gera o MP4 em até 2 min.
- [ ] Vídeo final tem 15 s (±0,2 s), resolução 1080×1920 (vertical) ou 1920×1080 (horizontal), H.264, 30 fps, faixa de áudio AAC silenciosa.

### 8.7 Montagem, ajustes e download
**Fluxo:** com o vídeo pronto, o usuário pode: (a) editar textos e CTA → "Atualizar vídeo · grátis"; (b) "Refazer cena X · 4 créditos" com instrução; (c) trocar a cena para uma versão anterior de clipe → remontagem grátis; (d) "Baixar vídeo".
- [ ] Texto sobreposto respeita área segura do formato (regra 11.8) e usa cor de destaque da marca no CTA.
- [ ] Fecho: últimos 2,5 s da cena 3 com logo da marca centralizado + CTA (+ oferta, se houver). Sem logo: nome da marca.
- [ ] `com_texto = false`: sem texto nas cenas, mas com o fecho.
- [ ] Remontagem não debita créditos e incrementa `versao_montagem`.
- [ ] Nome do arquivo baixado: `<instagram-ou-marca>_<produto>_<formato>_v<versao_montagem>.mp4`, sem acento e sem espaço (ex.: `kore_active_top-kore-preto_9x16_v2.mp4`).

### 8.8 Créditos para o usuário, histórico e painel de custos
- [ ] Saldo visível no topo de todas as telas da marca.
- [ ] Extrato com data, descrição da ação, item (link), quantidade e saldo após.
- [ ] Biblioteca de anúncios com filtro por produto e status.
- [ ] `[Admin] Custos`: por marca e por mês — créditos consumidos, custo USD real (soma de `geracoes.custo_usd`), custo em R$ (cotação de `configuracoes`), receita (soma de `valor_pago_centavos`) e margem.
- [ ] `[Admin] Gerações`: lista filtrável por status, com entrada, erro e link do resultado.

### 8.9 Compra de créditos com Stripe
**Objetivo:** o lojista compra um pacote e o saldo é creditado sozinho.
**Fluxo:** Créditos → "Comprar créditos" → escolhe o pacote (créditos, preço na moeda do pacote) → "Pagar" → página da Stripe → paga → volta para `/creditos/obrigado` → vê "Pronto! {n} créditos adicionados" e o novo saldo. Cancelou → volta para Créditos com "Compra cancelada. Nada foi cobrado."
- [ ] Só pacotes `ativo = true` aparecem, na ordem de `ordem`, com preço formatado na moeda do pacote (`Intl.NumberFormat`).
- [ ] `POST /api/creditos/checkout` cria `pagamentos` com status `iniciado`, cria a Checkout Session com `client_reference_id`, `metadata` e URLs da seção 4.5, e grava `stripe_checkout_session_id`.
- [ ] Marca pausada (`ativa = false`) não consegue comprar (mensagem da seção 15).
- [ ] Webhook com assinatura inválida responde 400 e não altera nada.
- [ ] Pagamento em modo de teste (`4242 4242 4242 4242`) credita exatamente os créditos do pacote uma única vez, mesmo com o webhook reenviado e a página de obrigado recarregada (teste automatizado chamando `fulfillCheckout` 3 vezes, inclusive em paralelo).
- [ ] O extrato mostra a compra com o valor e a moeda; `saldo_apos` correto.
- [ ] `checkout.session.expired` marca o pagamento `expirado`; `async_payment_failed` marca `falhou`; nenhum crédito.
- [ ] Reembolso feito no painel da Stripe gera o ajuste negativo da regra 11.2.10.
- [ ] `[Admin] Configurações` lista, cria e desativa pacotes (nome, créditos, preço, moeda, `stripe_price_id`).
- [ ] `[Admin] Marca` → aba Pagamentos lista os pagamentos com status.

---

## 9. Fluxos principais ponta a ponta

### 9.1 Onboarding da marca piloto
1. Admin cria a marca "Kore Active" (seed) e convida o e-mail do dono.
2. Dono recebe o convite, define a senha, entra.
3. Dono compra o primeiro pacote em Créditos → Comprar créditos, pago pela Stripe (8.9). Se o primeiro pacote for cortesia, o admin lança `bonus`.
4. Dono abre "Marca", sobe o logo, escolhe a cor e confirma o CTA.
5. **Exceção:** o dono não sobe logo → vídeos saem com o nome da marca no fecho e a tela Início mostra lembrete "Adicione seu logo para ele aparecer nos vídeos".

### 9.2 Da peça ao vídeo
1. Novo produto → fotos → "Gerar ficha" → aprova (ou refaz).
2. Novo anúncio → opções → "Criar anúncio".
3. Vê os 3 quadros → refaz o que não gostou → escolhe as versões → edita textos se quiser.
4. "Gerar vídeo" → espera (pode sair do app) → vídeo pronto.
5. Ajusta texto, refaz cena ou baixa.
6. **Exceção — saldo acaba no meio:** qualquer botão cobrado desabilita com "Saldo insuficiente" e link "Comprar créditos" (abre a escolha de pacotes). Nada do que já foi gerado se perde.
7. **Exceção — usuário fecha o app durante a geração:** a geração continua no servidor; ao voltar, a tela mostra o estado atual.

### 9.3 Falha de geração
1. Higgsfield devolve `failed` ou `nsfw` → retentativa automática (tentativa 2, sem cobrança).
2. Falha de novo → item `falhou`, estorno do valor correspondente (regra 11.2.4), mensagem ao usuário com botão de tentar de novo.
3. Admin vê a falha em `[Admin] Gerações` com o erro.

---

## 10. Inventário de telas

Navegação do usuário da marca: barra inferior no celular (Início, Produtos, Anúncios, Créditos) e barra superior no desktop; "Marca" e "Sair" no menu do perfil. Navegação do admin: menu lateral (seção 16.4).

| Tela | O que mostra | Ações | Lê | Escreve (via) |
|---|---|---|---|---|
| `[Público] Entrar` | e-mail, senha, "Esqueci minha senha" | entrar | — | auth |
| `[Público] Definir/Redefinir senha` | nova senha + confirmação | salvar | — | auth |
| `[Marca] Início` | saldo, botão "Novo anúncio", últimos 6 anúncios, produtos sem ficha, lembrete de logo | navegar | `marcas`, `anuncios`, `produtos` | — |
| `[Marca] Produtos` | grade de produtos com foto/ficha e selo de status; filtro categoria | novo, abrir, arquivar | `produtos`, `fichas_produto` | `produtos` (RLS) |
| `[Marca] Novo produto` | nome, categoria, gênero, descrição, upload de 1–4 fotos | salvar | — | `produtos`, `fotos_produto`, Storage (RLS) |
| `[Marca] Produto` | fotos originais, ficha atual e versões, anúncios do produto | gerar/refazer/aprovar ficha, editar dados, novo anúncio com este produto | `produtos`, `fotos_produto`, `fichas_produto`, `anuncios` | `/api/produtos/:id/ficha`, `/api/fichas/:id/aprovar` |
| `[Marca] Novo anúncio` (4 passos + resumo) | escolhas da seção 11.4, custo | criar | `produtos`, `precos_acoes` | `/api/anuncios` |
| `[Marca] Anúncio` | estado conforme status: progresso; 3 cartões de cena (quadro, versões, descrição, texto); player do vídeo final | refazer quadro, usar versão, editar textos, gerar vídeo, refazer cena, voltar versão de clipe, atualizar vídeo, baixar, arquivar, renomear | `anuncios`, `cenas`, `quadros`, `clipes`, `precos_acoes` | rotas da seção 13 |
| `[Marca] Anúncios` | biblioteca; filtro produto e status | abrir | `anuncios` | — |
| `[Marca] Créditos` | saldo, extrato, tabela de preços por ação, histórico de pagamentos | comprar créditos | `movimentacoes_creditos`, `precos_acoes`, `pagamentos` | — |
| `[Marca] Comprar créditos` | pacotes ativos (créditos, preço, quantos anúncios típicos rende) | pagar (vai para a Stripe) | `pacotes_creditos` | `/api/creditos/checkout` |
| `[Marca] Compra concluída` (`/creditos/obrigado`) | confirmação, créditos adicionados, novo saldo; estado "confirmando pagamento…" enquanto `fulfillCheckout` roda | voltar ao início, novo anúncio | `pagamentos`, `marcas` | `fulfillCheckout` (servidor) |
| `[Marca] Marca` | logo, nome, @, cor, CTA, tom de voz, prévia do fecho do vídeo | salvar | `marcas` | `marcas` (RLS), Storage |
| `[Admin] Marcas` | lista com saldo, anúncios no mês, status | criar, abrir | `marcas` | `/api/admin/marcas` |
| `[Admin] Marca` | kit, usuários, extrato, pagamentos, anúncios | editar, pausar, lançar créditos, convidar usuário | todas da marca | `/api/admin/*` |
| `[Admin] Usuários` | todos os usuários, marca, status | convidar, desativar/reativar | `perfis` | `/api/admin/usuarios` |
| `[Admin] Custos` | indicadores da seção 8.8 por marca/mês | exportar CSV (seção 14) | `geracoes`, `movimentacoes_creditos`, `configuracoes` | — |
| `[Admin] Gerações` | lista de gerações com filtro tipo/status/marca | abrir detalhe, reprocessar webhook | `geracoes` | `/api/admin/geracoes/:id/reconsultar` |
| `[Admin] Configurações` | preços por ação, pacotes de créditos, modelos, cotações | salvar, criar/desativar pacote | `precos_acoes`, `pacotes_creditos`, `configuracoes` | `/api/admin/configuracoes`, `/api/admin/pacotes` |

---

## 11. Regras de negócio

### 11.1 Preço em créditos por ação (seed de `precos_acoes`, editável pelo admin)

| Ação (`acao_cobravel`) | Créditos | Quando cobra | Descrição no botão/extrato |
|---|---|---|---|
| `gerar_ficha` | 2 | 1ª ficha de um produto | Gerar ficha do produto |
| `refazer_ficha` | 1 | cada nova versão de ficha | Refazer ficha |
| `gerar_roteiro_quadros` | 2 | criar anúncio (roteiro + 3 quadros) | Criar anúncio |
| `refazer_quadro` | 1 | cada nova versão de quadro pedida pelo usuário | Refazer imagem da cena |
| `gerar_video` | 12 | animar as 3 cenas + 1ª montagem | Gerar vídeo |
| `refazer_clipe` | 4 | cada nova versão de clipe pedida pelo usuário, inclui remontagem | Refazer cena em vídeo |
| `remontar_texto` | 0 | editar texto/CTA ou voltar versão de clipe | Atualizar vídeo |

**Anúncio típico** (sem refação): 2 + 12 = 14 créditos. **Com refações usuais** (2 quadros + 1 cena): 2 + 2 + 12 + 4 = 20 créditos. Ficha é cobrada por produto, não por anúncio.

O que **não** é cobrado: regeneração automática de QC, retentativa automática por falha técnica, remontagem, download, voltar para versão anterior.

### 11.2 Créditos

| # | Regra | Onde |
|---|---|---|
| 11.2.1 | Débito acontece **antes** de submeter a geração, numa transação; sem saldo, nada é submetido | servidor + `debitar_creditos` |
| 11.2.2 | Saldo nunca negativo | check em `marcas` + função |
| 11.2.3 | Créditos não expiram no piloto | — (pergunta aberta 25.3 para a v2) |
| 11.2.4 | Falha técnica definitiva gera estorno. Ação que cobre várias gerações (`gerar_video` = 3 clipes): estorno de `floor(12 / 3) = 4` créditos por cena que falhou definitivamente; se as 3 falharem, estorno integral (12) | servidor + `estornar_creditos` |
| 11.2.5 | Resultado que o usuário não gostou **não** é estornado (é refação) | — |
| 11.2.6 | `compra` exige `valor_pago_centavos > 0` e `moeda`; `bonus` e `ajuste_manual` exigem `observacao` | `lancar_creditos`, `creditar_pagamento` |
| 11.2.7 | Mudança de preço em `precos_acoes` vale só para ações iniciadas depois | servidor lê o preço no momento do débito |
| 11.2.8 | Créditos são da marca, compartilhados entre os usuários dela | modelo |
| 11.2.9 | Pacotes iniciais (seed, a confirmar em 25.1): **Pacote 50** = 50 créditos por US$ 30; **Pacote 120** = 120 créditos por US$ 65. Moeda e valores reais vêm dos Prices da Stripe | `pacotes_creditos` + Stripe |
| 11.2.10 | Compra via Stripe só credita com `payment_status = 'paid'`, uma única vez por Checkout Session; reembolso total na Stripe remove os créditos ainda não usados (até o saldo disponível) | `creditar_pagamento`, `estornar_pagamento` |
| 11.2.11 | Créditos comprados não são reembolsados pela plataforma depois de usados; reembolso é decisão manual do admin no painel da Stripe | — |

**Proposta comercial para o piloto (a confirmar — pergunta aberta 25.1):** pacotes em dólar pela Stripe — 50 créditos por US$ 30 (US$ 0,60/crédito) e 120 créditos por US$ 65 (≈ US$ 0,54/crédito). Custo estimado de um anúncio de 20 créditos: cerca de US$ 3 a 4 em geração. Receita equivalente: cerca de US$ 11 a 12, menos a taxa da Stripe. Margem bruta estimada: ~60%, antes de custos fixos (Supabase, worker). O painel de custos (8.8) mede a margem real.

### 11.3 Estrutura do anúncio

| Regra | Valor |
|---|---|
| Cenas por anúncio | exatamente 3 |
| Duração de cada clipe | 5 s |
| Duração total | 15 s |
| Papel da cena 1 | **gancho**: movimento de impacto, enquadramento fechado ou ângulo incomum, peça já visível nos primeiros 1,5 s |
| Papel da cena 2 | **produto em ação**: o exercício da modalidade, com a peça em destaque e o logo visível |
| Papel da cena 3 | **herói + fecho**: plano médio ou aberto, modelo em pose de confiança/fim de série; últimos 2,5 s recebem o fecho com logo e CTA |
| Texto por cena | até 2 linhas de 32 caracteres; a cena 3 não leva texto próprio (o fecho ocupa o espaço) |
| Ficha usada | a `ficha_aprovada_id` do produto no momento da criação, congelada em `anuncios.ficha_id` |

### 11.4 Opções do anúncio e efeito

| Opção | Valores | Padrão | Efeito |
|---|---|---|---|
| Cenário | academia, box de crossfit, estúdio funcional, ao ar livre urbano, ao ar livre natureza, pista de corrida | academia | ambiente, luz e objetos de cena nos prompts |
| Modalidade | musculação, crossfit, hyrox, corrida, funcional, yoga/pilates | musculação | exercícios e movimentos das cenas (tabela do Anexo C.5) |
| Modelo | mulher, homem | derivado do produto | |
| Faixa etária | 20–30, 30–45, 45+ | 20–30 | |
| Estilo | energético, cinematográfico, lifestyle | energético | ritmo, câmera e luz (Anexo C.5) |
| Formato | vertical 9:16 (Reels/Stories), horizontal 16:9 | vertical | proporção de quadros, clipes e montagem |
| Texto na tela | sim/não | sim | |
| Oferta | texto livre opcional, até 40 caracteres | vazio | aparece no fecho, abaixo do CTA |
| Observações | texto livre opcional, até 200 caracteres | vazio | entra no prompt do Claude como preferência, subordinada aos princípios 2 e 3 |

Combinações incoerentes (ex.: `yoga_pilates` + `box_crossfit`) são permitidas; o Claude adapta o roteiro. Sem validação no frontend.

### 11.5 Checagem de qualidade (QC) do quadro

Executada pelo Claude com visão, comparando o quadro com a ficha aprovada (prompt no Anexo C.4). Saída estruturada com notas 0–10:

| Critério | Reprova se |
|---|---|
| `fidelidade_peca` (cor, modelagem, recortes) | nota < 7 |
| `logo_visivel_correto` (quando a ficha tem logo) | nota < 6 |
| `anatomia` (mãos, membros, rosto) | nota < 6 |
| `texto_espurio` (letras/logos inventados na imagem) | `true` |
| `conteudo_improprio` (nudez, sensualização) | `true` |

Reprovado → 1 regeneração automática sem cobrança, com o motivo anexado ao prompt. Reprovado de novo → mostra ao usuário com aviso (8.5). `conteudo_improprio = true` nunca é mostrado: vira `falhou` e estorno.

### 11.6 Configurações (seed de `configuracoes`)

| Chave | Valor inicial | Uso |
|---|---|---|
| `modelo_imagem` | endpoint ID do modelo de edição de imagem (confirmar na doc) | ficha e quadros |
| `modelo_video` | endpoint ID do Kling 3.0 image-to-video (confirmar na doc) | clipes |
| `resolucao_video` | `"1080p"` | clipes |
| `preco_usd_por_segundo_video` | `0.112` | cálculo de `custo_usd` (Kling 3.0 1080p sem áudio; confirmar no console) |
| `preco_usd_por_imagem` | `0.08` | cálculo de `custo_usd` (confirmar no console) |
| `cotacao_usd_brl` | `5.50` | painel de custos |
| `cotacoes_para_brl` | `{"usd": 5.50, "eur": 6.00}` | converter receita de pagamentos em outras moedas para o painel |
| `modelo_claude_roteiro` | `"claude-sonnet-5-5"` | roteiro e refação |
| `modelo_claude_qc` | `"claude-sonnet-5-5"` | QC |
| `contato_suporte` | texto com WhatsApp/e-mail do admin | mensagens de conta pausada e suporte |

### 11.7 Validações de texto
| Campo | Limite |
|---|---|
| `texto_tela` | 2 linhas × 32 caracteres; sem emoji |
| `cta_padrao` | 40 caracteres |
| `texto_oferta` | 40 caracteres |
| `observacoes` | 200 caracteres |
| Instrução de refação | 200 caracteres |

O Claude revisa todo texto de tela gerado por ele contra promessas proibidas em publicidade (resultado garantido de emagrecimento ou medidas, alegação médica, comparação depreciativa com concorrente). Texto digitado pelo usuário não é bloqueado, mas recebe aviso se contiver essas promessas (Anexo C.6).

### 11.8 Montagem (worker)

| Item | Regra |
|---|---|
| Ordem | cena 1, 2, 3, corte seco, sem transição |
| Resolução | 1080×1920 (vertical) / 1920×1080 (horizontal); clipe em proporção diferente é recortado ao centro |
| Fonte | Inter Bold (arquivo no repositório do worker), branco com sombra 2 px a 50% |
| Área segura vertical | texto entre 15% e 70% da altura (evita interface do Reels no topo e na base) |
| Área segura horizontal | margem de 6% em todos os lados |
| Texto da cena | aparece de 0,3 s a 4,7 s da cena, fade de 0,2 s |
| Fecho | de 12,5 s a 15 s: escurecimento de 40% sobre o clipe, logo centralizado (largura 40% no vertical, 20% no horizontal), CTA abaixo na `cor_destaque` (branco se nula), oferta abaixo do CTA |
| Áudio | faixa AAC silenciosa (compatibilidade); sem música (seção 24, A-4) |
| Saída | MP4 H.264, perfil High, 30 fps, CRF 20, `-preset veryfast`, `+faststart` |

---

## 12. Máquinas de estado e tratamento de erro

### 12.1 `fichas_produto.status`
`gerando` → `aguardando_aprovacao` (sucesso) | `falhou` (2 falhas técnicas)
`aguardando_aprovacao` → `aprovada` | `descartada` (quando outra versão é aprovada)
`aprovada` → `descartada` (quando outra versão é aprovada depois)

### 12.2 `anuncios.status`
| De | Para | Gatilho |
|---|---|---|
| (criação) | `gerando_roteiro` | POST /api/anuncios com débito ok |
| `gerando_roteiro` | `gerando_quadros` | roteiro válido salvo |
| `gerando_roteiro` | `falhou` | Claude falha 2x → estorno |
| `gerando_quadros` | `aguardando_aprovacao` | 3 quadros em estado final (`pronto`), mesmo com aviso de QC |
| `gerando_quadros` | `falhou` | os 3 quadros `falhou` → estorno integral |
| `aguardando_aprovacao` | `gerando_clipes` | "Gerar vídeo" com débito ok |
| `gerando_clipes` | `montando` | 3 cenas com clipe atual `pronto` |
| `gerando_clipes` | `aguardando_aprovacao` | alguma cena falhou definitivamente (estorno parcial; usuário tenta de novo) |
| `montando` | `pronto` | worker subiu o MP4 |
| `montando` | `montando` | erro no worker: até 3 tentativas, depois `erro` preenchido e alerta no admin |
| `pronto` | `gerando_clipes` | "Refazer cena" com débito ok |
| `pronto` | `montando` | editar texto / voltar versão de clipe |

Transição proibida: qualquer volta para `gerando_roteiro`. Refazer roteiro inteiro = novo anúncio.

Enquanto em `gerando_*` ou `montando`, a tela bloqueia ações que mudam o anúncio.

### 12.3 `geracoes.status`
`na_fila` → `processando` (aceita pela API) → `concluida` | `falhou` | `bloqueada_nsfw`. Geração em `processando` há mais de 15 min sem webhook nem resposta no polling → `falhou` (timeout) e segue a política de retentativa.

### 12.4 `quadros.status` / `clipes.status`
`gerando` → `pronto` | `falhou`; `pronto` → `descartado` só quando o anúncio for arquivado (versões ficam disponíveis para "usar esta").

### 12.5 `pagamentos.status`
`iniciado` → `pago` (`checkout.session.completed` com `payment_status = 'paid'`, ou `async_payment_succeeded`) | `falhou` (`async_payment_failed`) | `expirado` (`checkout.session.expired`)
`pago` → `reembolsado` (`charge.refunded` com reembolso total). Reembolso parcial: só registra em `observacao` e alerta o admin.
Transições proibidas: qualquer saída de `reembolsado`, `expirado` ou `falhou`.

---

## 13. Contratos de API

Todas as rotas exigem sessão (exceto o webhook), respondem JSON e validam o corpo com Zod. Erros: `{ "erro": "<codigo>", "mensagem": "<texto para o usuário>" }`.

| Método e rota | Quem | Corpo | Validação antes de agir | Efeito |
|---|---|---|---|---|
| `POST /api/produtos/:id/ficha` | marca/admin | `{ instrucao?: string }` | produto da marca do usuário; não arquivado; ≥1 foto; nenhuma ficha `gerando` | debita `gerar_ficha` ou `refazer_ficha`; cria versão; submete |
| `POST /api/fichas/:id/aprovar` | marca/admin | — | ficha da marca; status `aguardando_aprovacao`, `aprovada` ou `descartada` com imagem | define `ficha_aprovada_id`; demais versões não `gerando` → `descartada` |
| `POST /api/anuncios` | marca/admin | opções da 11.4 + `produto_id` | produto com ficha aprovada; marca ativa | debita; cria anúncio e roteiro; submete quadros |
| `POST /api/cenas/:id/refazer-quadro` | marca/admin | `{ instrucao?: string }` | anúncio em `aguardando_aprovacao` | debita `refazer_quadro`; nova versão |
| `POST /api/cenas/:id/usar-quadro` | marca/admin | `{ quadro_id }` | quadro `pronto` da mesma cena | define `quadro_atual_id` |
| `PATCH /api/anuncios/:id/textos` | marca/admin | `{ cenas: [{ id, texto_tela }], cta?: string, texto_oferta?: string }` | limites da 11.7; status `aguardando_aprovacao` ou `pronto` | salva; se `pronto`, vai a `montando` (grátis) |
| `POST /api/anuncios/:id/gerar-video` | marca/admin | — | status `aguardando_aprovacao`; 3 quadros atuais `pronto` | debita `gerar_video`; submete 3 clipes |
| `POST /api/cenas/:id/refazer-clipe` | marca/admin | `{ instrucao?: string }` | status `pronto` ou `aguardando_aprovacao` após falha | debita `refazer_clipe`; nova versão a partir do `quadro_atual_id` |
| `POST /api/cenas/:id/usar-clipe` | marca/admin | `{ clipe_id }` | clipe `pronto` da mesma cena; status `pronto` | define `clipe_atual_id`; vai a `montando` |
| `GET /api/anuncios/:id/download` | marca/admin | — | anúncio da marca; `video_final_path` não nulo | devolve URL assinada (60 min) com nome do arquivo da regra 8.7 |
| `POST /api/webhooks/higgsfield?token=` | Higgsfield | payload da API | `token` igual a `HF_WEBHOOK_TOKEN`; `request_id` existe | idempotente por `request_id`; atualiza geração, copia resultado, avança estados |
| `POST /api/creditos/checkout` | marca | `{ pacote_id }` | pacote ativo; marca ativa; usuário da marca | cria `pagamentos` e Checkout Session; devolve `{ url }` para redirecionar |
| `GET /creditos/obrigado?session_id=` | marca | — | sessão pertence à marca do usuário | chama `fulfillCheckout` e renderiza a confirmação |
| `POST /api/webhooks/stripe` | Stripe | evento bruto | assinatura válida com `STRIPE_WEBHOOK_SECRET` | trata os eventos da seção 4.5; idempotente |
| `POST /api/admin/pacotes` / `PATCH /api/admin/pacotes/:id` | admin | `{ nome, creditos, preco_centavos, moeda, stripe_price_id, ativo, ordem }` | `stripe_price_id` existe na Stripe e moeda/valor batem com o Price | cria/edita pacote |
| `POST /api/admin/marcas` | admin | dados do kit | — | cria marca |
| `POST /api/admin/usuarios` | admin | `{ email, nome, marca_id }` | e-mail não existe | convite + perfil |
| `PATCH /api/admin/usuarios/:id` | admin | `{ ativo }` | — | ativa/desativa |
| `POST /api/admin/creditos` | admin | `{ marca_id, tipo, quantidade, valor_pago_centavos?, moeda?, observacao? }` | regra 11.2.6 | `lancar_creditos` |
| `PUT /api/admin/configuracoes` | admin | `{ precos?: [...], configuracoes?: [...] }` | creditos ≥ 0 | atualiza |
| `POST /api/admin/geracoes/:id/reconsultar` | admin | — | geração `processando` | consulta `status_url` e processa como webhook |

Toda rota de admin confere `eh_admin()` no servidor; esconder o menu não é permissão.

---

## 14. Relatórios e exportação

**`[Admin] Custos` → Exportar CSV**
- Nome: `custos_<aaaa-mm>.csv` (mês filtrado; "todos" → `custos_completo.csv`).
- UTF-8 **com BOM**, separador `;`, decimal com vírgula, datas `dd/mm/aaaa`.
- Uma linha por marca no mês. Colunas, nesta ordem: `marca`, `mes`, `anuncios_criados`, `videos_gerados`, `creditos_consumidos`, `creditos_estornados`, `custo_usd`, `custo_brl`, `receita_moeda_original` (ex.: "65,00 usd"), `receita_brl` (convertida por `cotacoes_para_brl`), `taxas_stripe_brl` (vazio no MVP — a taxa real fica no painel da Stripe), `margem_brl`, `margem_percentual`.
- Respeita o filtro de marca aplicado na tela.

---

## 15. Copy e tom de voz

Tom: direto, positivo, frases curtas, "você". Sem termos de IA ("prompt", "modelo", "gerar com IA" só onde inevitável). Conteúdo final, não placeholder.

| Lugar | Texto |
|---|---|
| Início, vazio | "Comece pelo produto: suba uma foto da peça e a gente prepara a ficha." |
| Produtos, vazio | "Nenhum produto ainda. Pode ser foto de celular, no cabide ou em cima da mesa." |
| Upload, erro de formato | "Esse arquivo não deu. Use foto JPG, PNG ou HEIC de até 10 MB." |
| Ficha, gerando | "Preparando a ficha da peça. Leva uns 2 minutos — pode sair que a gente guarda." |
| Ficha, pronta | "Confira se a peça está igual à real: cor, recortes e logo." |
| Ficha, refazer (campo) | "O que está diferente da peça real?" |
| Anúncio, gerando quadros | "Montando as 3 cenas do seu anúncio…" |
| Anúncio, aguardando | "Escolha a imagem de cada cena. Gostou das três? Gere o vídeo." |
| Aviso QC | "Pode não estar fiel à peça — sugerimos refazer." |
| Refazer quadro (campo) | "O que você quer mudar nessa cena? (opcional)" |
| Gerando vídeo | "Animando as cenas. Leva uns 5 minutos — avisamos aqui quando ficar pronto." |
| Vídeo pronto | "Seu anúncio está pronto." |
| Falha de cena | "Não conseguimos animar a cena {n}. Os créditos dela voltaram para você." |
| Falha geral | "Algo deu errado do nosso lado. Os créditos voltaram para o seu saldo." |
| Saldo insuficiente (botão) | "Saldo insuficiente" |
| Comprar créditos (título) | "Escolha um pacote" |
| Pacote (linha de apoio) | "Rende cerca de {n} anúncios" (créditos ÷ 20, arredondado para baixo) |
| Indo para o pagamento | "Abrindo o pagamento seguro…" |
| Confirmando | "Confirmando seu pagamento…" |
| Compra concluída | "Pronto! {n} créditos adicionados." |
| Compra cancelada | "Compra cancelada. Nada foi cobrado." |
| Pagamento falhou | "O pagamento não foi aprovado. Tente outro cartão." |
| Conta pausada | "Conta pausada. Fale com o suporte: {contato_suporte}" |
| Usuário desativado | "Seu acesso foi desativado. Fale com o suporte." |
| Ajuste negativo inválido (admin) | "O ajuste deixaria o saldo negativo." |
| Aviso de texto proibido | "Evite prometer resultado (ex.: emagrecer X kg). Isso pode derrubar seu anúncio no Instagram." |
| Lembrete de logo | "Adicione seu logo para ele aparecer no fim dos vídeos." |

---

## 16. Direção visual

### 16.1 Princípio
Interface clara e calma — o produto é a fotografia da marca, não a interface. Referência: simplicidade estilo Apple (lista agrupada, tipografia forte, muito espaço) com a energia do universo fitness vindo **das imagens**, não de cores berrantes na UI. Mobile-first: o usuário principal opera pelo celular.

### 16.2 Tokens
- Fundo: `#FFFFFF` (claro) / `#0B0B0C` (escuro). Superfície: `#F5F5F7` / `#1C1C1E`.
- Texto: `#1D1D1F` / `#F5F5F7`; secundário `#6E6E73` / `#A1A1A6`.
- Cor de destaque da plataforma (marca): verde-limão `#C6F432` sobre texto escuro em botões primários. **Não** usar como cor de status.
- Cores semânticas (só significado): sucesso `#34C759`, alerta `#FF9F0A`, erro `#FF3B30`, processando `#0A84FF`.
- Tipografia: Inter (Display para títulos 28/22/17, Text para corpo 15–17). Números de saldo em tabular.
- Raio: 14 px em cartões, 10 px em botões. Hairlines `1px` em vez de bordas grossas.
- Modo escuro: suportado, segue o sistema.

### 16.3 Imagens da plataforma (geradas na Higgsfield via MCP, durante o épico de UI)
| Uso | Briefing |
|---|---|
| Tela de entrada (fundo, metade esquerda no desktop / topo no celular) | atleta mulher em academia escura com luz lateral, top e legging pretos lisos sem marca, movimento de levantamento terra, foto editorial, grão leve |
| Estado vazio de Produtos | peça de roupa fitness preta dobrada sobre banco de madeira, luz de janela, minimalista |
| Estado vazio de Anúncios | homem correndo em rua urbana ao amanhecer, desfoque de movimento, cores frias |
| Ícone/miniatura das opções de cenário (6) | cada cenário da 11.4, sem pessoas, enquadramento quadrado |
| Ícone/miniatura das modalidades (6) | silhueta de atleta executando o movimento típico, fundo neutro |

Regra: nenhuma imagem da plataforma mostra logo real ou marca de terceiros.

### 16.4 Navegação do admin — menu lateral estilo App Store Connect
- Grupos com título em **negrito escuro**, caixa normal: **Clientes** (Marcas, Usuários), **Operação** (Gerações, Custos), **Sistema** (Configurações).
- Itens indentados sob o grupo, sem marcador; hairline fina entre grupos.
- Um item ativo por vez, em `#5B8C00` (verde da marca escurecido para contraste em texto) com pílula clara do mesmo tom ao fundo.
- Rodapé: usuário + sair + selo discreto de ambiente (dev/prod).
- Cantos suaves, hairlines, espaçamento generoso.

### 16.5 Livre para o agente
Ícones (SF Symbols-like via Lucide), microanimações de progresso, layout exato dos cartões, desde que respeitem 16.1–16.4.

---

## 17. Requisitos não-funcionais

| Requisito | Alvo |
|---|---|
| Primeira carga da tela Início no 4G | < 2,5 s (LCP) |
| Ficha pronta | p90 < 3 min |
| Quadros prontos após criar anúncio | p90 < 4 min |
| Vídeo pronto após "Gerar vídeo" | p90 < 10 min (clipes) + < 2 min (montagem) |
| Atualização de estado na tela | Supabase Realtime nas tabelas `anuncios`, `quadros`, `clipes`, `fichas_produto`; fallback polling 5 s |
| Navegadores | Safari iOS 17+, Chrome Android 12+, Chrome/Safari/Edge desktop atuais |
| Acessibilidade | contraste AA, alvos de toque ≥ 44 px, labels em todos os campos, vídeo com controles nativos |
| Idioma | pt-BR apenas (preços na moeda do pacote) |
| Volume do piloto | 1 marca, até 3 usuários, até 30 anúncios/mês |
| Concorrência na Higgsfield | máx. 10 requisições simultâneas por instância |
| Armazenamento | originais até 10 MB; quadros ~2 MB; clipes ~10 MB; vídeo final ~15 MB. Estimativa piloto < 5 GB/ano |

---

## 18. Convenções de código, documentação e estrutura do repositório

- **Idioma — banco em português, código em inglês.** Tabelas, colunas, enums, funções, triggers e políticas em português, `snake_case`. Código, variáveis, funções e nomes de arquivo em inglês. Os tipos gerados do banco (`supabase gen types`) mantêm os nomes em português; a fronteira fica em `apps/web/src/server/db/`.
- **Comentários obrigatórios.** Toda função, hook React, rota de servidor, função do worker, trigger e política tem comentário de cabeçalho em português: o que faz, o que recebe, o que devolve e a regra do spec que implementa (ex.: `// Implementa a regra 11.2.4: estorno proporcional por cena`). Lógica não óbvia leva comentário inline.
- **Prompts são código.** Ficam em `apps/web/src/server/prompts/` como arquivos `.md` versionados no nome (`roteiro.v1.md`, `quadro.v1.md`, `refacao.v1.md`, `qc-quadro.v1.md`, `qc-texto.v1.md`, `ficha.v1.md`). Mudança de prompt = arquivo novo `vN+1` + atualizar a constante `PROMPT_VERSIONS`. A versão usada fica em `anuncios.prompt_versao`. Nunca editar um prompt já usado em produção.

### Estrutura de pastas
```
apps/
  web/
    src/
      app/                 # rotas Next.js (páginas e /api)
      features/
        products/          # componentes, hooks e tipos de produto e ficha
        ads/               # anúncio, cenas, quadros, clipes, player
        credits/           # saldo, extrato
        brand/             # kit da marca
        admin/             # telas do admin
      components/ui/       # componentes base
      server/
        db/                # cliente Supabase do servidor e tipos
        higgsfield/        # cliente da API, webhook, cálculo de custo
        claude/            # cliente, schemas Zod das saídas
        prompts/           # prompts versionados (.md)
        credits/           # chamadas às funções de crédito
        stripe/            # cliente Stripe, checkout, fulfillCheckout, webhook
  worker/
    src/                   # loop de montagem, ffmpeg, upload
    assets/fonts/          # Inter Bold
supabase/
  migrations/
  seed.sql
scripts/
  seed-admin.ts
plans/
```

### Variáveis de ambiente
| Variável | Onde | Secreta |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | web | não |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web | não |
| `SUPABASE_SERVICE_ROLE_KEY` | web (servidor), worker | **sim** |
| `ANTHROPIC_API_KEY` | web (servidor) | **sim** |
| `HF_API_KEY_ID`, `HF_API_KEY_SECRET` | web (servidor) | **sim** |
| `HF_WEBHOOK_TOKEN` | web (servidor) | **sim** |
| `STRIPE_SECRET_KEY` | web (servidor) | **sim** |
| `STRIPE_WEBHOOK_SECRET` | web (servidor) | **sim** |
| `SEED_STRIPE_PRICE_PACOTE_50`, `SEED_STRIPE_PRICE_PACOTE_120` | script de seed | não |
| `APP_URL` | web, worker | não |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_SENHA` | script de seed | **sim** |
| reservado v2: `MERCADOPAGO_ACCESS_TOKEN` (Pix), `RESEND_API_KEY`, `ELEVENLABS_API_KEY` | — | sim |

### Documentação viva
- `schema.sql` na raiz, gerado do banco real a cada migration (`supabase db dump --schema public`).
- `README.md`: setup local, variáveis, migrations, como rodar o worker, como testar o webhook localmente (túnel).
- `DOCUMENTACAO-TECNICA.md` (seção 19).
- `CLAUDE.md` na raiz, cabendo em uma página: convenções desta seção, mapa da arquitetura (4.4), comandos (22.1) com exemplo de saída saudável, e "Pegadinhas" iniciais:
  - "Nunca exibir prompt, nome de modelo ou custo USD para `usuario_marca`."
  - "Webhook da Higgsfield chega repetido: tudo idempotente por `request_id`."
  - "Copiar o resultado da Higgsfield para o Storage antes de marcar `pronto`."
  - "Débito de crédito sempre antes de submeter; estorno só via `estornar_creditos`."
  - "Crédito de compra só via `creditar_pagamento`, a partir de `fulfillCheckout`; nunca a partir do redirect sozinho nem de dado vindo do navegador."
  - "Webhook da Stripe precisa do corpo bruto (sem parse de JSON antes de verificar a assinatura)."
  - Quando o agente errar a mesma coisa duas vezes, a correção entra aqui.
- `CLAUDE.md`, `DOCUMENTACAO-TECNICA.md` e `README.md` são atualizados no mesmo commit da mudança.

### 18.1 Guardrails executáveis

| Regra | Origem | Mecanismo |
|---|---|---|
| Credencial privilegiada (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `HF_API_KEY_SECRET`, `HF_WEBHOOK_TOKEN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) nunca em código de cliente | 20 | hook `guard-secrets.sh` |
| Migration versionada não se edita | 7.6 | hook `guard-migrations.sh` |
| Teste não se edita em modo correção | 22.1 | hook `guard-tests.sh` |
| Prompt versionado não se edita (cria-se `vN+1`) | 18 | hook `guard-prompts.sh` |
| Advisors após migration | 20 | hook `remind-advisors.sh` |
| Critérios de aceite, matriz de permissões, regras de crédito | 5, 8, 11 | subagente `verifier` + `REVIEW.md` |
| Convenções de idioma e comentários | 18 | `CLAUDE.md` + `REVIEW.md` |

---

## 19. Documento de documentação técnica (entregável)

Ao fim da implementação, gerar `DOCUMENTACAO-TECNICA.md` em português, descrevendo o sistema como ficou:
1. Modelo de dados explicado — cada tabela, cada coluna em linguagem de negócio, valores de enum e significado.
2. Relacionamento entre tabelas — diagrama em texto e uma frase por relação.
3. Regras no banco — todas as funções, triggers e políticas com nome exato, tabela, quando disparam e o que fazem.
4. Mapa tela → tabelas — o que cada tela lê, escreve e por quais rotas/políticas passa.
5. Lógica por tela — validações, gravações, cálculos e onde acontecem; mensagens de erro.
6. Pipeline de geração — sequência de chamadas Claude → Higgsfield → webhook → worker, com estados e política de retentativa e estorno.
   Pipeline de pagamento — Checkout → webhook/página de obrigado → `fulfillCheckout` → `creditar_pagamento`, com eventos tratados e idempotência.
7. Divergências em relação ao spec, com o porquê.

Toda mudança em schema, função, política, prompt ou lógica de tela atualiza este documento no mesmo commit.

---

## 20. Privacidade, segurança e conformidade

- **Dados coletados:** nome e e-mail dos usuários (acesso), dados da marca, fotos de produtos, imagens e vídeos gerados, livro de créditos. Base legal LGPD: execução de contrato.
- **Fotos com pessoas:** o lojista pode subir a peça vestida por alguém. Essas fotos servem só para gerar a ficha (que remove a pessoa — prompt do Anexo C.1). **Nenhum prompt pede para reproduzir rosto ou aparência de pessoa real**; os modelos dos anúncios são sempre fictícios. A tela de upload avisa: "Se a foto tiver alguém, usamos só a peça."
- **Onde ficam:** Supabase (região São Paulo, se disponível no plano — premissa a validar), buckets privados, URLs assinadas de 60 min. Imagens enviadas à Higgsfield e ao Claude como URL temporária ou base64; a Higgsfield guarda resultados pela política dela (verificar termos — pergunta aberta 25.4).
- **Retenção:** enquanto a marca estiver ativa; após encerramento do contrato, exclusão em até 90 dias sob pedido. Exclusão feita manualmente pelo admin (script `scripts/apagar-marca.ts`, roadmap v2 com tela).
- **Segredos:** só em variáveis de ambiente do servidor (Vercel/Railway). Nunca em `NEXT_PUBLIC_*`, nunca em log. Hook `guard-secrets.sh`.
- **Webhook da Higgsfield:** protegido por token na query, comparação em tempo constante; payload logado sem URLs assinadas.
- **Pagamentos:** dados de cartão nunca passam pelo nosso servidor nem pelo banco (página hospedada da Stripe). Guardamos só ids da Stripe, valor, moeda e status. Webhook da Stripe validado por assinatura. O cliente estrangeiro é atendido sob a LGPD (empresa brasileira) — a política de privacidade precisa citar a Stripe como operadora de pagamento (pergunta aberta 25.7).
- **Advisors do Supabase** (segurança e performance) rodados após toda migration; nenhum alerta crítico pendente.
- **Guardrails de IA (não dependem do modelo julgar):**
  - Lista fixa de termos proibidos no texto da tela ("emagreça", "perca X kg", "queima gordura", "cura", "garantido") checada por regex no servidor antes da montagem; se presentes em texto gerado pelo Claude, o texto é descartado e substituído pelo `descricao` neutro da cena; se digitado pelo usuário, aviso (11.7).
  - Prompts de imagem e vídeo sempre incluem cláusulas fixas de vestuário esportivo completo e não sensual (Anexo C), concatenadas pelo código, não pelo Claude.
  - Resultado `nsfw` da Higgsfield ou `conteudo_improprio` do QC nunca é exibido.
  - O vídeo do modelo nunca recebe instrução de gerar texto ou logo; logo e texto entram só na montagem.

---

## 21. Métricas de sucesso e telemetria

| Métrica | Alvo no piloto (60 dias) |
|---|---|
| Anúncios que chegam a `pronto` / anúncios criados | ≥ 80% |
| Anúncios baixados por semana pelo lojista | ≥ 2 |
| Créditos médios por anúncio pronto | ≤ 22 |
| Margem bruta real (receita − custo de geração) | ≥ 55% |

Fonte: as próprias tabelas (sem analytics externo no piloto). O painel `[Admin] Custos` mostra as quatro métricas. Eventos não carregam imagem nem texto do usuário.

---

## 22. Estratégia de teste

- **Banco (pgTAP ou testes de integração com Supabase local):** RLS de todas as tabelas para os dois perfis; `debitar_creditos` (saldo insuficiente, marca inativa, preço zero, concorrência — dois débitos simultâneos não deixam saldo negativo); `estornar_creditos` idempotente; livro-razão imutável; soma das movimentações = saldo.
- **Pagamento (Vitest + Stripe em modo de teste):** `fulfillCheckout` idempotente (3 chamadas, inclusive concorrentes = 1 crédito); webhook com assinatura inválida rejeitado; sessão `unpaid` não credita; `charge.refunded` gera ajuste limitado ao saldo; teste manual de ponta a ponta com `stripe listen` e o cartão 4242.
- **Servidor (Vitest):** máquina de estados de 12.2 (cada transição permitida e uma proibida); processamento de webhook idempotente (mesmo payload 2x = 1 efeito); estorno proporcional da regra 11.2.4; validação dos schemas Zod das saídas do Claude com respostas de exemplo válidas e inválidas; regex de termos proibidos.
- **Higgsfield e Claude:** clientes atrás de interface; testes usam dublês com respostas gravadas. Um teste manual de ponta a ponta com chave real por épico de geração.
- **Worker:** teste que monta 3 clipes sintéticos (ffmpeg `testsrc`) e confere duração 15 s ± 0,2, resolução, presença de faixa de áudio e frame do fecho diferente do frame anterior.
- **Manual (piloto):** 5 anúncios reais com peças da Kore Active cobrindo 3 cenários, 3 modalidades e os 2 formatos.

### 22.1 Loop de verificação
- Comandos (na raiz):
  - `npm run typecheck` — tsc em web e worker.
  - `npm run lint`
  - `npm test` — Vitest + testes de banco (sobe Supabase local).
  - `npm run build`
  - `npm run verify` — os quatro acima em sequência; termina com erro se qualquer um falhar.
- Nenhum épico é declarado pronto sem colar a saída de `npm run verify` e o relatório do subagente `verifier` sem item "não cumprido".
- Critério quantificável por épico = todos os checkboxes da seção 8 correspondente.
- Bug se corrige com teste primeiro: escrever o teste que reproduz, ver falhar, commitar, `touch .claude/fix-mode`, corrigir sem tocar no teste, `rm .claude/fix-mode`.
- UI: quando houver ferramenta de navegador disponível, capturar as telas em 390 px e 1280 px e comparar com o design aprovado.
- **Regra de ouro (no `CLAUDE.md`):** se um teste falhar, corrija o código, não o teste; nunca pule nem apague teste que falha.

---

## 23. Riscos e mitigação

| Risco | Impacto | Prob. | Mitigação |
|---|---|---|---|
| Fidelidade da peça insuficiente (logo deformado, cor errada) a partir de fotos ruins | alto — lojista não usa o vídeo | alta | ficha de produto aprovada pelo usuário; ficha sempre como referência; QC com nota de fidelidade; texto/logo da marca só na montagem; testar 2 modelos de imagem no épico 8.4 e escolher pelo resultado |
| Kling deforma o logo durante o movimento | médio | média | prompt de movimento contido (Anexo C.3), clipe de 5 s, refação de cena; configuração permite trocar para Seedance 2.5 |
| Preço por segundo da Higgsfield muda | médio — margem cai | média | custo real registrado por geração; painel de margem; preços em créditos editáveis sem deploy |
| Termos da Higgsfield API não permitem revenda/uso em plataforma para terceiros | alto para virar produto | baixa-média | verificar antes de sair do piloto (25.4); arquitetura com cliente de geração atrás de interface para trocar fornecedor |
| Higgsfield não aceita URL assinada externa como entrada | baixo — retrabalho | baixa | usar upload de mídia da API (confirmar no épico 8.4) |
| Webhook não chega (deploy, timeout) | médio — geração "travada" | média | polling de reserva (4.3) e botão de reconsulta no admin |
| Lojista acha os 15 s genéricos ("todo anúncio parece igual") | médio | média | variação de roteiro por estilo/modalidade (Anexo C.5); versionar prompts e comparar por versão |
| Concorrência: Higgsfield Ads/Marketing Studio fazem algo parecido | médio para a tese de produto | alta | diferencial é vertical (fitness), fluxo guiado e zero aprendizado; medir no piloto se o lojista usaria sozinho a ferramenta da Higgsfield |
| Conta Stripe aberta no Brasil tem repasse mais lento e taxa de cartão internacional maior; produtos da Stripe no Brasil podem ter restrições | médio — fluxo de caixa e margem | média | confirmar entidade, país da conta e taxas antes do épico 8.9 (25.6); taxa entra no preço dos pacotes |
| Webhook da Stripe não chega e o saldo não aparece | médio — suporte | baixa | página de obrigado também chama `fulfillCheckout`; Stripe reenvia webhooks; admin vê pagamentos `iniciado` antigos |
| Worker parado (container caiu) | médio — anúncio fica em `montando` | baixa | healthcheck + alerta; admin vê anúncios em `montando` há mais de 10 min |

---

## 24. Assunções declaradas

> **Assunção não revisada vira verdade no minuto em que o agente começa a codar.** Revise antes de colar no Claude Code.

| # | Assunção | Por quê | Se discordar |
|---|---|---|---|
| A-1 | Nome provisório "AdFit" em toda a interface, centralizado numa constante | ainda não há nome | trocar a constante |
| A-2 | Compra de créditos por Stripe Checkout (página hospedada), pacotes avulsos, sem assinatura | cliente piloto fora do Brasil; menor esforço e sem dado de cartão no nosso lado | assinatura mensal na 28.5 |
| A-12 | Pacotes cobrados em dólar (USD) | moeda mais simples para cliente no exterior; a Stripe converte do cartão dele | trocar a moeda dos Prices para a do país dele (25.1) |
| A-3 | 3 cenas de 5 s, ordem gancho → ação → herói | estrutura clássica de anúncio curto; simplifica preço e montagem | mudar a regra 11.3 |
| A-4 | Vídeo sai **sem música** (faixa silenciosa); o lojista põe o áudio no Instagram | evita licenciamento e permite usar áudio em alta | antecipar a 28.3 |
| A-5 | Kling 3.0 1080p sem áudio como modelo de vídeo padrão | melhor relação custo × controle a partir de quadro; preço por segundo conhecido | trocar em Configurações |
| A-6 | Todos os usuários de uma marca têm as mesmas permissões | piloto com 1–3 pessoas | criar papel `gestor_marca` |
| A-7 | Sem notificação externa; aviso só dentro do app | piloto | antecipar a 28.6 |
| A-8 | Créditos não expiram | piloto | ver 25.3 |
| A-9 | O admin opera ações em nome da marca consumindo crédito da marca | suporte ao piloto | exigir confirmação extra |
| A-10 | Visual da plataforma claro, estilo Apple, energia vinda das fotos; verde-limão como cor da marca | combina com o gosto do responsável e com fitness sem poluir | redefinir a seção 16 |
| A-11 | Ficha gera uma única imagem composta (frente, costas, detalhe do logo) | uma só referência simplifica os prompts seguintes | gerar 3 imagens separadas |

---

## 25. Perguntas abertas

O agente de código **pergunta** ao cruzar com qualquer item abaixo; nunca assume.

| # | Pergunta | Quem decide | Até quando |
|---|---|---|---|
| 25.1 | Preço dos pacotes e moeda (proposta: 50 créditos por US$ 30, 120 por US$ 65; ou a moeda do país onde seu irmão mora) e se o primeiro pacote é cortesia | Alexandre | antes do épico 8.9 |
| 25.2 | Nome definitivo da plataforma e domínio | Alexandre | antes do épico de UI final |
| 25.3 | Créditos expiram na v2 (ex.: 90 dias)? | Alexandre | antes da v2 |
| 25.4 | Termos de uso da Higgsfield API permitem uso em plataforma para terceiros e qual a retenção dos arquivos gerados | Alexandre (ler termos / contatar Higgsfield) | antes do segundo cliente |
| 25.5 | Endpoint IDs exatos dos modelos de imagem (edição com referência) e de vídeo, e preço por segundo/imagem no console | agente valida na doc e confirma com Alexandre | épico 8.4 |
| 25.6 | Em nome de quem fica a conta Stripe (Dab Lab? CNPJ?), país da conta, moeda de repasse e taxas aplicáveis a cartão internacional | Alexandre | antes do épico 8.9 |
| 25.7 | Emissão de nota fiscal (de exportação de serviço) para a venda de créditos e texto da política de privacidade/termos citando Stripe, Higgsfield e Anthropic | Alexandre (com contador) | antes de cobrar de verdade |

---

## 26. Definition of Done

- [ ] Todos os critérios da seção 8 cumpridos, com saída de `npm run verify` colada por épico.
- [ ] Relatório do subagente `verifier` sem "não cumprido" em todos os épicos.
- [ ] Matriz de permissões (5) coberta por testes de RLS.
- [ ] Banco em português `snake_case`, sem tabela ou coluna fora do padrão.
- [ ] Todas as rotinas, triggers e políticas comentadas.
- [ ] Advisors de segurança e performance do Supabase rodados após a última migration, sem alerta crítico.
- [ ] Guardrails do Anexo B instalados em `.claude/` e cada hook testado uma vez.
- [ ] `plans/` com o plano aprovado de cada épico, consistente com o código.
- [ ] Prompts v1 do Anexo C em `server/prompts/`, versão registrada nos anúncios.
- [ ] 5 anúncios reais da Kore Active gerados de ponta a ponta (22, manual) e baixados.
- [ ] `DOCUMENTACAO-TECNICA.md` gerado e conferido.
- [ ] `CLAUDE.md` e `README.md` em dia.
- [ ] Compra de ponta a ponta em modo de teste da Stripe e uma compra real de valor baixo em produção, creditando uma única vez.
- [ ] Deploy de produção na Vercel e worker no ar, com webhook da Higgsfield recebendo em produção.

---

## 27. Próximos passos operacionais

1. Revisar as seções 24 e 25 (especialmente 25.1 e 25.5).
2. Criar conta na Higgsfield API (console), fazer recarga inicial (mínimo US$ 5; sugerido US$ 50 para o piloto) e gerar as chaves.
3. Criar projeto Supabase, repositório GitHub e projeto Vercel; criar serviço do worker (Railway ou Fly.io).
3a. Criar/usar a conta Stripe (25.6), criar os 2 Products/Prices dos pacotes em modo de teste, ativar recibos por e-mail e cadastrar o endpoint de webhook `https://<app>/api/webhooks/stripe` com os eventos da seção 4.5.
4. Colar o prompt de implementação no Claude Code; épico 0 primeiro.
5. As telas são geradas pelo próprio Claude Code a partir do `prompt-design-adfit.md` (ver prompt de implementação), com aprovação sua antes de implementar as telas.
6. Gerar as imagens da plataforma (16.3) na Higgsfield via MCP — pelo Claude Code, se o conector da Higgsfield estiver disponível na sessão dele; senão, numa conversa do Claude e salvar em `apps/web/public/images/`.
7. Pegar 3 peças reais da Kore Active com o irmão (fotos de celular, como ele faria) para os testes do épico 8.4.

---

## 28. Roadmap: próximas releases

### 28.1 Modelo falando para a câmera (v2)
Uma cena de 5–10 s em que o(a) modelo fala uma frase curta sobre a peça, com lip sync. Opções: texto da fala sugerido pelo Claude a partir do produto; voz pt-BR (ElevenLabs ou voz nativa do modelo de vídeo). Cobrança própria em créditos. Antes: medir taxa de falha e custo no console.

### 28.2 Narração em off (v2)
Locução pt-BR sobre o vídeo, texto gerado pelo Claude, vozes profissionais pt-BR do ElevenLabs. Ação cobrável `narrar` (preço a definir).

### 28.3 Trilha sonora (v2)
Biblioteca de faixas royalty-free curadas por estilo (energético, cinematográfico, lifestyle), ou geração de trilha por IA com licença comercial. Mixagem no worker.

### 28.4 Vídeo de 30 s (v2)
6 cenas; rever `cenas.ordem` (check 1–6), regra 11.3, preço de `gerar_video` e montagem.

### 28.5 Pagamentos — evolução (v2)
- **Assinatura mensal de créditos** (Stripe Billing, `mode=subscription`): X créditos por mês, renovação automática via `invoice.paid`.
- **Pix para clientes no Brasil:** habilitar Pix na própria Stripe, se disponível para a conta, ou gateway brasileiro (Mercado Pago/Asaas) chamando `creditar_pagamento`.
- **Autocadastro de marcas** com primeira compra no cadastro.

### 28.6 Notificações (v2)
E-mail (e/ou WhatsApp) quando ficha ou vídeo ficar pronto.

### 28.7 Outros
Formatos 4:5 e 1:1; várias peças no mesmo anúncio; publicação no Instagram/Meta (v3); papéis por marca; tela de exclusão de dados LGPD.

---

## 29. Protocolo de mudanças incrementais

1. Commit de checkpoint antes de qualquer mudança.
2. Não colar o spec inteiro de novo: colar só o trecho novo/alterado ou um spec adicional da feature.
3. Escrever a instrução como diff: "o projeto já existe e funciona".
4. Listar nominalmente o que **não** deve mudar.
5. Pedir plano em plan mode (arquivos, ordem, testes), aprovar e commitar em `plans/<feature>.md`. Bug: o plano começa pelo teste que reproduz.
6. Revisar o `git diff` contra o plano; reverter arquivo fora do escopo.
7. Atualizar `DOCUMENTACAO-TECNICA.md` (e `CLAUDE.md`, se for o caso) no mesmo commit.

Modelo de prompt:
```
O AdFit já está implementado e funcionando conforme spec.md v0.2.
Quero adicionar: <feature>, especificada em <arquivo ou trecho colado>.
NÃO altere: <telas/tabelas/rotas que não devem mudar>.
Entre em plan mode, mostre arquivos que mudam, migrations novas, ordem e testes que provam a mudança.
Depois de aprovado, salve em plans/<feature>.md, implemente, rode npm run verify, cole a saída,
acione o verifier e atualize DOCUMENTACAO-TECNICA.md no mesmo commit.
```

---

## Anexo — Fontes (consultadas em 31/10/2026)

- Higgsfield — AI Ad Agency (referência do fluxo e prompts): https://higgsfield.ai/blog/ai-ad-agency
- Higgsfield — API de vídeo vs assinatura (Kling 3.0 a US$ 0,084/s em 720p; falhas reembolsadas): https://higgsfield.ai/blog/ai-video-api-pricing-vs-subscriptions
- Higgsfield — Gerar vídeos pela API (preços por modelo; falhas não cobradas; saldo pré-pago): https://higgsfield.ai/blog/generate-ai-videos-higgsfield-api
- Higgsfield — Melhores APIs de vídeo (recarga mínima US$ 5; 20 requisições simultâneas): https://higgsfield.ai/blog/best-ai-video-generation-apis
- Higgsfield Docs — Webhooks: https://docs.higgsfield.ai/docs/how-to/webhooks
- Higgsfield Docs — Seedance 2.0 (image-to-video, polling/webhook): https://docs.higgsfield.ai/docs/models/seedance-2.md
- Higgsfield Docs — Seedance 2.5: https://docs.higgsfield.ai/docs/models/seedance-2-5.md
- Higgsfield Docs — Kling 2.5 Turbo image-to-video (idempotência, formato de resposta): https://docs.higgsfield.ai/docs/models/kling-2-5-turbo/pro-image-to-video.md
- Preço Claude Sonnet 5.5 (US$ 2 / US$ 10 por milhão de tokens): https://anotherwrapper.com/tools/llm-pricing/claude-sonnet-5-5
- Preço Claude Haiku 5.5: https://techenclave.com/news/items/claude-haiku-5-5-launches-with-0-10-input-pricing-for-shorter-prompts
- Gateways de pagamento no Brasil (taxas Pix): https://www.idinheiro.com.br/negocios/melhores-gateways-de-pagamento/
- Stripe — Fulfill orders (webhook `checkout.session.completed`, idempotência, página de retorno): https://docs.stripe.com/checkout/fulfillment?ui=full-page
- Stripe Brasil — disponibilidade de produtos: https://stripe.com/br/money-management/availability

---

## Anexo B — Kit de guardrails do Claude Code

Criados no épico 8.0. Scripts com `chmod +x`. Adicionar `.claude/fix-mode` ao `.gitignore`. Dependem de `jq`.

### `.claude/settings.json`
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/guard-secrets.sh" },
          { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/guard-migrations.sh" },
          { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/guard-prompts.sh" },
          { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/guard-tests.sh" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/remind-advisors.sh" }
        ]
      }
    ]
  }
}
```

### `.claude/hooks/guard-secrets.sh`
```bash
#!/bin/bash
# Bloqueia credencial privilegiada em código que roda (ou pode rodar) no cliente.
# Implementa a seção 20: segredos só em apps/web/src/server/ e apps/worker/.
# Rotas em src/app/api não leem segredo direto: importam de src/server/.
command -v jq >/dev/null || { echo "Guardrail inativo: jq não está instalado. Instale o jq (brew install jq) antes de continuar." >&2; exit 2; }
input=$(cat)
path=$(echo "$input" | jq -r '.tool_input.file_path // empty')
content=$(echo "$input" | jq -r '.tool_input.content // .tool_input.new_string // empty')

# Variável pública com nome de segredo é proibida em qualquer arquivo.
if echo "$content" | grep -qE 'NEXT_PUBLIC_[A-Z_]*(SERVICE_ROLE|SECRET|ANTHROPIC|HF_API|HF_WEBHOOK|STRIPE_SECRET|STRIPE_WEBHOOK)'; then
  echo "Bloqueado: segredo exposto como variável NEXT_PUBLIC_ (seção 20). Segredos nunca vão para o navegador." >&2
  exit 2
fi

case "$path" in
  */apps/web/src/app/*|*/apps/web/src/components/*|*/apps/web/src/features/*) ;;
  *) exit 0 ;;
esac

if echo "$content" | grep -qE 'service_role|SUPABASE_SERVICE_ROLE_KEY|ANTHROPIC_API_KEY|HF_API_KEY_SECRET|HF_API_KEY_ID|HF_WEBHOOK_TOKEN|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|sk_live_|sk_test_|whsec_'; then
  echo "Bloqueado: credencial privilegiada fora de src/server (seção 20). Crie/use uma função em apps/web/src/server/ e chame-a da rota ou da action." >&2
  exit 2
fi
exit 0
```

### `.claude/hooks/guard-migrations.sh`
```bash
#!/bin/bash
# Impede editar migration já versionada; mudança de schema vira migration nova (seção 7.6).
command -v jq >/dev/null || { echo "Guardrail inativo: jq não está instalado. Instale o jq (brew install jq) antes de continuar." >&2; exit 2; }
input=$(cat)
path=$(echo "$input" | jq -r '.tool_input.file_path // empty')
case "$path" in
  */supabase/migrations/*) ;;
  *) exit 0 ;;
esac
rel="${path#"$CLAUDE_PROJECT_DIR"/}"
if git -C "$CLAUDE_PROJECT_DIR" ls-files --error-unmatch "$rel" >/dev/null 2>&1; then
  echo "Bloqueado: $rel já está versionada. Crie uma nova migration com a alteração (seção 7.6)." >&2
  exit 2
fi
exit 0
```

### `.claude/hooks/guard-prompts.sh`
```bash
#!/bin/bash
# Prompt versionado é imutável: mudança vira arquivo vN+1 (seção 18 — "Prompts são código").
# Garante que anuncios.prompt_versao sempre aponte para o texto exato usado.
command -v jq >/dev/null || { echo "Guardrail inativo: jq não está instalado. Instale o jq (brew install jq) antes de continuar." >&2; exit 2; }
input=$(cat)
path=$(echo "$input" | jq -r '.tool_input.file_path // empty')
case "$path" in
  */apps/web/src/server/prompts/*.md) ;;
  *) exit 0 ;;
esac
rel="${path#"$CLAUDE_PROJECT_DIR"/}"
if git -C "$CLAUDE_PROJECT_DIR" ls-files --error-unmatch "$rel" >/dev/null 2>&1; then
  echo "Bloqueado: $rel já está versionado. Crie a próxima versão (ex.: roteiro.v2.md) e atualize PROMPT_VERSIONS (seção 18)." >&2
  exit 2
fi
exit 0
```

### `.claude/hooks/guard-tests.sh`
```bash
#!/bin/bash
# Em modo correção (.claude/fix-mode), impede editar testes para "fazer passar" (seção 22.1).
[ -f "$CLAUDE_PROJECT_DIR/.claude/fix-mode" ] || exit 0
command -v jq >/dev/null || { echo "Guardrail inativo: jq não está instalado. Instale o jq (brew install jq) antes de continuar." >&2; exit 2; }
input=$(cat)
path=$(echo "$input" | jq -r '.tool_input.file_path // empty')
case "$path" in
  *.test.ts|*.test.tsx|*.spec.ts|*/__tests__/*|*/supabase/tests/*)
    echo "Bloqueado: modo de correção ativo. Corrija o código, não o teste (seção 22.1). Se o teste estiver errado, pare e explique ao humano." >&2
    exit 2 ;;
esac
exit 0
```

### `.claude/hooks/remind-advisors.sh`
```bash
#!/bin/bash
# Após escrever migration, lembra de rodar os advisors do Supabase (seção 20).
command -v jq >/dev/null || { echo "Guardrail inativo: jq não está instalado. Instale o jq (brew install jq) antes de continuar." >&2; exit 2; }
input=$(cat)
path=$(echo "$input" | jq -r '.tool_input.file_path // empty')
case "$path" in
  */supabase/migrations/*)
    echo "Migration escrita. Depois de aplicá-la, rode get_advisors (security e performance), resolva alertas críticos e atualize schema.sql (seções 18 e 20)." >&2
    exit 2 ;;
esac
exit 0
```

### `.claude/agents/verifier.md`
```markdown
---
name: verifier
description: Confere em contexto limpo se o épico implementado cumpre os critérios de aceite do spec.md. Use ao terminar cada épico, antes de declarar pronto.
tools: Bash, Read, Grep
---
Você verifica; não corrige nada.

1. Leia em spec.md a seção 8.X do épico indicado, a matriz de permissões (seção 5), as políticas (6.4) e as regras de negócio (seção 11) que o épico toca. Se o épico gera ou cobra algo, leia também as seções 11.1, 11.2 e 12.
2. Leia o plano em plans/ correspondente e o git diff do épico.
3. Rode `npm run verify` e guarde a saída.
4. Para cada critério de aceite: cumprido / não cumprido / não verificável — sempre com evidência (saída de comando ou arquivo:linha).
5. Confira que nenhuma tela ou resposta de API para usuario_marca expõe prompt, nome de modelo, payload de geração ou custo em USD.
6. Confira que toda ação cobrada debita antes de submeter e que toda falha definitiva estorna (regra 11.2). Se o épico toca pagamento: crédito só via creditar_pagamento a partir de fulfillCheckout, webhook com assinatura verificada, idempotência por Checkout Session (seções 4.5 e 12.5).
7. Para cada tabela tocada, confira se a RLS bate com 6.4, inclusive o escopo "só a própria marca".
8. Liste divergências entre o diff e o plano.

Termine com uma linha: PRONTO ou NÃO PRONTO, e os itens que impedem.
```

### `REVIEW.md`
```markdown
# Instruções de revisão

## Passes
- Bugs: lógica, estados da seção 12, idempotência do webhook, condições de corrida no débito de créditos.
- Segurança: matriz da seção 5 e políticas da 6.4; segredos só em src/server e worker; nada de prompt/modelo/custo USD para usuario_marca; dados pessoais fora de log (seção 20).
- Conformidade: bate com spec.md (épicos da 8, regras da 11), com plans/ e com a seção 18 — banco em português snake_case, rotinas comentadas com a regra que implementam, prompts versionados sem edição de versão existente.

## O que é Importante
O que quebra comportamento, cobra crédito errado, vaza dado entre marcas ou viola regra do spec. Estilo é detalhe.

## Limite de detalhes
No máximo cinco detalhes por revisão; resuma o resto como contagem.

## Não reportar
Arquivos gerados (tipos do Supabase, schema.sql) e o que lint/typecheck já garantem.
```

---

## Anexo C — Prompts v1 (o coração do produto)

Estes textos viram os arquivos `*.v1.md` em `apps/web/src/server/prompts/`. Placeholders entre `{chaves}` são preenchidos pelo código. **Cláusulas fixas** (marcadas como tal) são concatenadas pelo código ao final de todo prompt de imagem/vídeo, nunca escritas pelo Claude (seção 20).

### C.0 Cláusulas fixas

**Imagem (`CLAUSULA_IMAGEM`):**
```
The garment must match the reference sheet exactly: same color, fabric texture, seams, straps, cut-outs, waistband and the brand mark with identical shape, color, size and position. Do not invent, add or alter any logo, letters, text, watermark or graphic. Athletic wear worn fully and as designed; natural athletic posture; adult model; non-sexualized, sports-advertising framing. Photorealistic, high detail, accurate hands and anatomy.
```

**Vídeo (`CLAUSULA_VIDEO`):**
```
Keep the garment, its colors and the brand mark exactly as in the first frame throughout the shot; no morphing of clothing. No text, captions, letters or logos appearing. Realistic human motion and physics. Single continuous shot, no cuts.
```

### C.1 `ficha.v1.md` — ficha de produto (prompt de edição de imagem, montado pelo código)
```
Create a clean product reference sheet of the exact {categoria_en} shown in the reference photos.
Layout: one image, light grey seamless background (#EDEDED), three panels side by side with equal spacing:
(1) FRONT view, (2) BACK view, (3) CLOSE-UP of the brand mark/logo area.
Show the garment alone, as a ghost-mannequin e-commerce shot: remove any person, hands, hanger, table, packaging, props and wrinkles.
If the back is not visible in the photos, infer it conservatively from the front, keeping it plain.
{instrucao_refacao_en}
Even soft studio lighting, true-to-life colors, sharp fabric detail.
{CLAUSULA_IMAGEM}
```
`{instrucao_refacao_en}`: instrução do usuário traduzida para inglês pelo Claude (prompt C.3, modo ficha); vazio na versão 1.

### C.2 `roteiro.v1.md` — system prompt do Claude
```
Você é diretor(a) criativo(a) de anúncios curtos de moda fitness para Instagram, especialista em
Reels de 15 segundos que vendem roupa de treino. Você escreve o roteiro de um anúncio de 3 cenas de 5 s
e os prompts técnicos (em inglês) para um modelo de imagem e um modelo de vídeo image-to-video.

Entradas: a imagem da ficha da peça, os dados do produto, o kit da marca e as escolhas do lojista.

Regras de roteiro:
1. Cena 1 = GANCHO. Nos primeiros 1,5 s precisa haver movimento forte e a peça visível. Use enquadramento
   fechado, ângulo baixo ou detalhe em movimento (ex.: mãos apertando a barra, passada em close).
2. Cena 2 = PEÇA EM AÇÃO. Exercício típico da modalidade (tabela abaixo), enquadramento que mostre a peça
   inteira e a área do logo.
3. Cena 3 = HERÓI. Plano médio/aberto, modelo em pose de confiança ou fim de série, respirando,
   olhando para a câmera ou para o lado. Deixe espaço visual no centro para o fecho com logo.
4. A peça é sagrada: descreva-a nos prompts pelo que se vê na ficha (cor, tipo, recortes, posição do logo).
   Nunca mude cor ou modelagem. Se a peça é só a parte de cima, escolha uma parte de baixo neutra (preta lisa,
   sem marca) e vice-versa.
5. Modelo: {genero_modelo}, aparência de {faixa_etaria}, corpo atlético realista. Varie etnia e cabelo
   de forma natural, a menos que as observações do lojista peçam algo específico. Nunca descreva pessoa real.
6. Câmera e luz seguem o estilo escolhido (tabela abaixo). Proporção {formato}.
7. prompt_quadro: um único frame fotográfico, descrevendo sujeito, ação congelada, ambiente, luz, lente
   (ex.: 35mm, f/2), composição para {formato}. Sem texto. Máximo 90 palavras.
8. prompt_movimento: só o que se move e como a câmera se move em 5 s, a partir daquele frame
   (ex.: "slow push-in as she completes the rep"). Não introduza objetos novos. Máximo 40 palavras.
9. texto_tela (português): cenas 1 e 2, até 2 linhas de 32 caracteres, tom: {tom_de_voz}.
   Cena 1: frase-gancho curta. Cena 2: benefício concreto da peça (sustentação, conforto, liberdade de
   movimento) — use a descrição do produto se houver. Cena 3: null (o fecho tem o CTA).
   Proibido prometer resultado corporal, alegação médica ou comparar com concorrente.
   Se com_texto = false, devolva texto_tela null em todas as cenas.
10. descricao (português): uma frase simples para o lojista entender a cena.
11. Observações do lojista: siga-as quando não conflitarem com as regras 4 e 9.

Tabelas de referência: {tabela_modalidades} {tabela_estilos}

Responda chamando a ferramenta `salvar_roteiro` com o JSON do schema. Nada além disso.
```

**Schema da ferramenta `salvar_roteiro` (validado com Zod no servidor):**
```json
{
  "type": "object",
  "required": ["conceito", "cenas"],
  "properties": {
    "conceito": { "type": "string", "maxLength": 200 },
    "cenas": {
      "type": "array", "minItems": 3, "maxItems": 3,
      "items": {
        "type": "object",
        "required": ["ordem", "descricao", "prompt_quadro", "prompt_movimento", "texto_tela"],
        "properties": {
          "ordem": { "type": "integer", "enum": [1, 2, 3] },
          "descricao": { "type": "string", "maxLength": 140 },
          "prompt_quadro": { "type": "string", "maxLength": 900 },
          "prompt_movimento": { "type": "string", "maxLength": 400 },
          "texto_tela": { "type": ["string", "null"], "maxLength": 65 }
        }
      }
    }
  }
}
```

**Montagem do prompt do quadro (código):** `prompt_quadro` + `"Reference image 1 is the garment reference sheet."` + `CLAUSULA_IMAGEM`, com a ficha aprovada como imagem de referência.
**Montagem do prompt do clipe (código):** `prompt_movimento` + `CLAUSULA_VIDEO`, com o quadro atual como primeiro frame, duração 5 s, proporção do anúncio.

### C.3 `refacao.v1.md` — traduzir pedido do lojista em ajuste de prompt
```
Você ajusta um prompt técnico de geração (imagem ou vídeo) a partir de um pedido em português de um
lojista que não entende de IA. Entradas: tipo (ficha | quadro | clipe), prompt atual, pedido do lojista
(pode estar vazio), e, se houver, o motivo de reprovação do controle de qualidade.

- Pedido vazio: mantenha a intenção e mude a execução (outro ângulo, outra pose, outra luz) para dar uma
  alternativa real.
- Pedido sobre a peça ("a cor está mais clara", "o logo é menor"): reforce a fidelidade à ficha nesse ponto.
- Clipe: prefira movimentos mais contidos se o pedido indicar deformação ("a roupa mudou", "ficou estranho").
- Nunca remova as regras da peça nem adicione texto/logo.
- Ignore pedidos fora do escopo de anúncio de roupa fitness ou que sexualizem o modelo.
Devolva via ferramenta `salvar_prompt` com { "prompt": string (inglês), "resumo_pt": string (≤ 80 caracteres,
o que mudou, para mostrar ao lojista) }.
```

### C.4 `qc-quadro.v1.md` — controle de qualidade
```
Você é controle de qualidade de imagens publicitárias de moda fitness. Compare a IMAGEM GERADA com a FICHA DA PEÇA.
Avalie com rigor, como um lojista que conhece a própria peça.
Devolva via ferramenta `salvar_qc`:
{
  "fidelidade_peca": 0-10,          // cor, modelagem, recortes, alças, cós
  "logo_visivel_correto": 0-10,     // 10 = logo igual ao da ficha e legível; use 10 se a ficha não tem logo
  "anatomia": 0-10,                 // mãos, dedos, membros, rosto
  "texto_espurio": boolean,         // há letras/logos que não existem na ficha?
  "conteudo_improprio": boolean,    // nudez, sensualização, roupa faltando
  "motivo": string                  // ≤ 200 caracteres, em inglês, para orientar uma nova geração
}
```
Aprovação calculada pelo **código** com os limites da regra 11.5 (não pelo Claude).

### C.5 Tabelas de referência injetadas no roteiro

**Modalidades**
| Modalidade | Movimentos sugeridos | Objetos de cena |
|---|---|---|
| musculação | agachamento livre, levantamento terra, supino com halteres, remada | barra olímpica, anilhas, halteres, banco |
| crossfit | thruster, wall ball, kettlebell swing, box jump, corda | caixa de salto, kettlebell, wall ball, rig |
| hyrox | sled push, sled pull, burpee broad jump, sandbag lunges, remo ergométrico, SkiErg | trenó, saco de areia, remo, SkiErg |
| corrida | passada em close, arrancada, alongamento pós-corrida | tênis, relógio, garrafa |
| funcional | prancha com deslocamento, afundo com rotação, battle rope | cordas, elásticos, cones |
| yoga/pilates | postura do guerreiro, prancha lateral, alongamento no reformer | tapete, bloco, reformer |

**Estilos**
| Estilo | Câmera | Luz | Ritmo |
|---|---|---|---|
| energético | handheld leve, push-in rápido, ângulos baixos | contraste alto, luz dura lateral | movimento intenso nas 3 cenas |
| cinematográfico | gimbal suave, slow motion, lente 50–85 mm | baixa luz, rim light, poeira/vapor no ar | cadência lenta, pose final longa |
| lifestyle | câmera estável na altura dos olhos | luz natural, tons quentes | movimento natural, sorriso, pausa entre séries |

### C.6 `qc-texto.v1.md` — revisão de texto da tela
```
Revise textos curtos de anúncio de moda fitness em português. Para cada texto, diga se contém:
promessa de resultado corporal (perder peso, medidas, "secar"), alegação médica/terapêutica,
comparação depreciativa com concorrente, ou erro de português. Sugira uma versão corrigida com o mesmo
sentido e no máximo 2 linhas de 32 caracteres. Devolva via ferramenta `salvar_revisao_texto`.
```
A lista fixa de termos proibidos da seção 20 roda por regex antes deste prompt e independe dele.
