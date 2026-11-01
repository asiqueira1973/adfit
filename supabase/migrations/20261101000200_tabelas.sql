-- =============================================================================
-- AdFit — tabelas (seção 7.3), com nomes, tipos, nulidade, defaults e checks do spec.
-- Acréscimos registrados em docs/mudancas-de-escopo.md / DOCUMENTACAO-TECNICA.md:
--   * MD-1: perfis.idioma e marcas.idioma_anuncios;
--   * divergência D-3: anuncios.montagem_iniciada_em e anuncios.tentativas_montagem
--     (necessárias para "sem montagem em andamento" e "até 3 tentativas", seções 7.5 e 12.2).
-- Ordem de criação respeita as FKs; as FKs circulares entram no fim.
-- =============================================================================

-- Marcas clientes (kit da marca + saldo). Saldo só muda pelas funções de crédito (7.5).
create table public.marcas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  instagram text check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  logo_path text,
  cor_destaque text check (cor_destaque ~ '^#[0-9A-Fa-f]{6}$'),
  cta_padrao text not null default 'Compre pelo link da bio' check (char_length(cta_padrao) <= 40),
  tom_de_voz text,
  idioma_anuncios public.idioma not null default 'pt_br',
  saldo_creditos integer not null default 0 check (saldo_creditos >= 0),
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Perfil de cada usuário do Supabase Auth; marca_id nulo só para admin (seção 5).
create table public.perfis (
  id uuid primary key references auth.users (id),
  marca_id uuid references public.marcas (id),
  papel public.papel_usuario not null default 'usuario_marca',
  nome text not null,
  email text not null unique,
  idioma public.idioma not null default 'pt_br',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  constraint perfis_marca_obrigatoria_chk check (papel = 'admin_plataforma' or marca_id is not null)
);

-- Peças cadastradas pela marca (soft delete por `arquivado`, seção 7.4).
create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas (id),
  nome text not null,
  categoria public.categoria_peca not null,
  genero_alvo public.genero_alvo not null default 'unissex',
  descricao text,
  ficha_aprovada_id uuid, -- fk adicionada no fim (circular com fichas_produto)
  arquivado boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Fotos originais do produto (1 a 4; limite garantido por trg_fotos_produto_limite).
create table public.fotos_produto (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id),
  marca_id uuid not null references public.marcas (id),
  storage_path text not null,
  ordem smallint not null default 1 check (ordem between 1 and 4),
  criado_em timestamptz not null default now()
);

-- Pacotes de créditos à venda; o preço de verdade é o Price da Stripe (seção 4.5).
create table public.pacotes_creditos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  creditos integer not null check (creditos > 0),
  preco_centavos integer not null check (preco_centavos > 0),
  moeda text not null check (moeda ~ '^[a-z]{3}$'),
  stripe_price_id text not null unique,
  ativo boolean not null default true,
  ordem smallint not null default 1,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Uma linha por Checkout Session criada; nunca excluída (seção 7.3).
create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas (id),
  pacote_id uuid not null references public.pacotes_creditos (id),
  criado_por uuid not null references public.perfis (id),
  creditos integer not null check (creditos > 0),
  valor_centavos integer not null check (valor_centavos >= 0),
  moeda text not null check (moeda ~ '^[a-z]{3}$'),
  status public.status_pagamento not null default 'iniciado',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  pago_em timestamptz,
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Livro-razão imutável de créditos; soma de `quantidade` = marcas.saldo_creditos.
create table public.movimentacoes_creditos (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas (id),
  tipo public.tipo_movimentacao not null,
  quantidade integer not null check (quantidade <> 0),
  saldo_apos integer not null check (saldo_apos >= 0),
  acao public.acao_cobravel,
  referencia_tipo text check (referencia_tipo in ('ficha', 'anuncio', 'quadro', 'clipe')),
  referencia_id uuid,
  estorno_de_id uuid references public.movimentacoes_creditos (id),
  valor_pago_centavos integer,
  moeda text check (moeda ~ '^[a-z]{3}$'),
  pagamento_id uuid unique references public.pagamentos (id),
  observacao text,
  criado_por uuid references public.perfis (id),
  criado_em timestamptz not null default now(),
  -- `acao` preenchida em consumo e estorno; nula nos demais tipos.
  constraint movimentacoes_acao_chk check ((tipo in ('consumo', 'estorno')) = (acao is not null)),
  -- consumo sempre negativo; compra, bônus e estorno sempre positivos.
  constraint movimentacoes_sinal_chk check (
    (tipo = 'consumo' and quantidade < 0)
    or (tipo in ('compra', 'bonus', 'estorno') and quantidade > 0)
    or tipo = 'ajuste_manual'
  ),
  -- estorno_de_id só em estorno, e todo estorno aponta o consumo original.
  constraint movimentacoes_estorno_chk check ((tipo = 'estorno') = (estorno_de_id is not null)),
  -- valor pago só em compra; compra exige valor > 0 e moeda (regra 11.2.6).
  constraint movimentacoes_valor_chk check (
    (tipo = 'compra' and valor_pago_centavos > 0 and moeda is not null)
    or (tipo <> 'compra' and valor_pago_centavos is null and moeda is null)
  ),
  -- pagamento_id só na compra creditada pela Stripe.
  constraint movimentacoes_pagamento_chk check (pagamento_id is null or tipo = 'compra'),
  -- bônus e ajuste exigem observação (regra 11.2.6).
  constraint movimentacoes_observacao_chk check (tipo not in ('bonus', 'ajuste_manual') or nullif(btrim(observacao), '') is not null)
);

-- Uma linha por chamada à Higgsfield; visível só ao admin (seção 6.4).
create table public.geracoes (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas (id),
  tipo public.tipo_geracao not null,
  modelo text not null,
  request_id text unique,
  status public.status_geracao not null default 'na_fila',
  entrada jsonb not null,
  resultado_url text,
  custo_usd numeric(10, 4),
  tentativa smallint not null default 1 check (tentativa >= 1),
  erro text,
  cobranca_id uuid references public.movimentacoes_creditos (id),
  criado_em timestamptz not null default now(),
  concluido_em timestamptz
);

-- Fichas de produto versionadas (seção 7.3 e 12.1).
create table public.fichas_produto (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id),
  marca_id uuid not null references public.marcas (id),
  versao integer not null check (versao >= 1),
  status public.status_ficha not null default 'gerando',
  imagem_path text,
  geracao_id uuid references public.geracoes (id),
  instrucao_refacao text check (char_length(instrucao_refacao) <= 200),
  criado_em timestamptz not null default now(),
  unique (produto_id, versao)
);

-- Anúncios (seção 7.3 e 12.2).
create table public.anuncios (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas (id),
  produto_id uuid not null references public.produtos (id),
  ficha_id uuid not null references public.fichas_produto (id),
  criado_por uuid not null references public.perfis (id),
  titulo text not null,
  cenario public.cenario not null,
  modalidade public.modalidade not null,
  genero_modelo public.genero_modelo not null,
  faixa_etaria public.faixa_etaria not null default 'de_20_a_30',
  estilo public.estilo_video not null default 'energetico',
  formato public.formato_video not null default 'vertical_9_16',
  com_texto boolean not null default true,
  texto_oferta text check (char_length(texto_oferta) <= 40),
  observacoes text check (char_length(observacoes) <= 200),
  status public.status_anuncio not null default 'gerando_roteiro',
  roteiro jsonb,
  prompt_versao text,
  video_final_path text,
  versao_montagem integer not null default 0 check (versao_montagem >= 0),
  -- D-3: marcador de montagem em andamento e contador de tentativas do worker (12.2).
  montagem_iniciada_em timestamptz,
  tentativas_montagem smallint not null default 0 check (tentativas_montagem >= 0),
  erro text,
  arquivado boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Exatamente 3 cenas por anúncio (regra 11.3); texto da tela até 2 linhas de 32 (regra 11.7).
create table public.cenas (
  id uuid primary key default gen_random_uuid(),
  anuncio_id uuid not null references public.anuncios (id),
  marca_id uuid not null references public.marcas (id),
  ordem smallint not null check (ordem between 1 and 3),
  descricao text not null,
  prompt_quadro text not null,
  prompt_movimento text not null,
  texto_tela text check (texto_tela ~ '^[^\n]{1,32}(\n[^\n]{1,32})?$'),
  quadro_atual_id uuid, -- fk no fim (circular com quadros)
  clipe_atual_id uuid,  -- fk no fim (circular com clipes)
  criado_em timestamptz not null default now(),
  unique (anuncio_id, ordem)
);

-- Versões de quadro-chave por cena (seção 12.4).
create table public.quadros (
  id uuid primary key default gen_random_uuid(),
  cena_id uuid not null references public.cenas (id),
  marca_id uuid not null references public.marcas (id),
  versao integer not null check (versao >= 1),
  status public.status_item not null default 'gerando',
  imagem_path text,
  geracao_id uuid references public.geracoes (id),
  instrucao_refacao text check (char_length(instrucao_refacao) <= 200),
  qc_aprovado boolean,
  qc_detalhe jsonb,
  criado_em timestamptz not null default now(),
  unique (cena_id, versao)
);

-- Versões de clipe de vídeo por cena (seção 12.4).
create table public.clipes (
  id uuid primary key default gen_random_uuid(),
  cena_id uuid not null references public.cenas (id),
  marca_id uuid not null references public.marcas (id),
  quadro_id uuid not null references public.quadros (id),
  versao integer not null check (versao >= 1),
  status public.status_item not null default 'gerando',
  video_path text,
  geracao_id uuid references public.geracoes (id),
  instrucao_refacao text check (char_length(instrucao_refacao) <= 200),
  criado_em timestamptz not null default now(),
  unique (cena_id, versao)
);

-- Preço em créditos de cada ação (regra 11.1), editável pelo admin.
create table public.precos_acoes (
  acao public.acao_cobravel primary key,
  creditos integer not null check (creditos >= 0),
  descricao text not null,
  atualizado_em timestamptz not null default now()
);

-- Configurações chave-valor (regra 11.6): modelos, preços USD, cotações, contato.
create table public.configuracoes (
  chave text primary key,
  valor jsonb not null,
  descricao text not null,
  atualizado_em timestamptz not null default now()
);

-- FKs circulares.
alter table public.produtos add constraint produtos_ficha_aprovada_id_fkey foreign key (ficha_aprovada_id) references public.fichas_produto (id);
alter table public.cenas add constraint cenas_quadro_atual_id_fkey foreign key (quadro_atual_id) references public.quadros (id);
alter table public.cenas add constraint cenas_clipe_atual_id_fkey foreign key (clipe_atual_id) references public.clipes (id);

-- Índices nas FKs e nos filtros usados pelas telas (advisor de performance "unindexed foreign keys").
create index perfis_marca_id_idx on public.perfis (marca_id);
create index produtos_marca_id_idx on public.produtos (marca_id);
create index produtos_ficha_aprovada_id_idx on public.produtos (ficha_aprovada_id);
create index fotos_produto_produto_id_idx on public.fotos_produto (produto_id);
create index fotos_produto_marca_id_idx on public.fotos_produto (marca_id);
create index pagamentos_marca_id_idx on public.pagamentos (marca_id, criado_em desc);
create index pagamentos_pacote_id_idx on public.pagamentos (pacote_id);
create index pagamentos_criado_por_idx on public.pagamentos (criado_por);
create index movimentacoes_marca_id_idx on public.movimentacoes_creditos (marca_id, criado_em desc);
create index movimentacoes_estorno_de_id_idx on public.movimentacoes_creditos (estorno_de_id);
create index movimentacoes_criado_por_idx on public.movimentacoes_creditos (criado_por);
create index geracoes_marca_id_idx on public.geracoes (marca_id, criado_em desc);
create index geracoes_status_idx on public.geracoes (status, criado_em);
create index geracoes_cobranca_id_idx on public.geracoes (cobranca_id);
create index fichas_produto_marca_id_idx on public.fichas_produto (marca_id);
create index fichas_produto_geracao_id_idx on public.fichas_produto (geracao_id);
create index anuncios_marca_id_idx on public.anuncios (marca_id, criado_em desc);
create index anuncios_produto_id_idx on public.anuncios (produto_id);
create index anuncios_ficha_id_idx on public.anuncios (ficha_id);
create index anuncios_criado_por_idx on public.anuncios (criado_por);
create index anuncios_montando_idx on public.anuncios (status) where status = 'montando';
create index cenas_marca_id_idx on public.cenas (marca_id);
create index cenas_quadro_atual_id_idx on public.cenas (quadro_atual_id);
create index cenas_clipe_atual_id_idx on public.cenas (clipe_atual_id);
create index quadros_marca_id_idx on public.quadros (marca_id);
create index quadros_geracao_id_idx on public.quadros (geracao_id);
create index clipes_cena_id_idx on public.clipes (cena_id);
create index clipes_marca_id_idx on public.clipes (marca_id);
create index clipes_quadro_id_idx on public.clipes (quadro_id);
create index clipes_geracao_id_idx on public.clipes (geracao_id);
