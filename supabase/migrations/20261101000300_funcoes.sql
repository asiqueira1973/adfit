-- =============================================================================
-- AdFit — funções do banco (seção 7.5).
-- Todas com `set search_path = ''` (advisor "function_search_path_mutable") e nomes
-- totalmente qualificados. Erros de negócio sobem como exceção cujo MESSAGE é o código
-- (`saldo_insuficiente`, `marca_inativa`…), traduzido pelo servidor em
-- apps/web/src/server/credits/ para { erro, mensagem } (seção 13).
-- Divergências registradas (D-1, D-2): parâmetros extras em estornar_creditos e lancar_creditos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- eh_admin() — seção 6.4/7.5.
-- Recebe: nada (usa auth.uid()). Devolve: true se o usuário logado é admin_plataforma ativo.
-- Usada nas políticas de RLS; security definer para não depender da RLS de `perfis`.
-- -----------------------------------------------------------------------------
create function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel = 'admin_plataforma' and ativo
  );
$$;

-- -----------------------------------------------------------------------------
-- minha_marca_id() — seção 6.4/7.5.
-- Recebe: nada. Devolve: marca_id do usuário logado (nulo para admin, para quem não tem
-- perfil e para perfil desativado — defesa extra além do logout do proxy, seção 6.3).
-- -----------------------------------------------------------------------------
create function public.minha_marca_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select marca_id from public.perfis where id = (select auth.uid()) and ativo;
$$;

-- -----------------------------------------------------------------------------
-- definir_atualizado_em() — função comum dos triggers trg_*_atualizado_em (seção 7.5).
-- Recebe: a linha nova do update. Devolve: a linha com atualizado_em = now().
-- -----------------------------------------------------------------------------
create function public.definir_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- debitar_creditos — regras 11.2.1, 11.2.2 e 11.2.7.
-- Recebe: marca, ação cobrável, quantidade de itens, referência do item e autor.
-- Faz: trava a marca (for update), lê o preço atual em precos_acoes, levanta
--   `marca_inativa` ou `saldo_insuficiente`, insere `consumo` negativo e baixa o saldo.
-- Devolve: id da movimentação; nulo (sem inserir) quando o preço da ação é 0.
-- -----------------------------------------------------------------------------
create function public.debitar_creditos(
  p_marca_id uuid,
  p_acao public.acao_cobravel,
  p_quantidade_itens integer,
  p_referencia_tipo text,
  p_referencia_id uuid,
  p_criado_por uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_marca public.marcas%rowtype;
  v_preco integer;
  v_total integer;
  v_id uuid;
begin
  if p_quantidade_itens is null or p_quantidade_itens < 1 then
    raise exception 'quantidade_invalida';
  end if;

  select * into v_marca from public.marcas where id = p_marca_id for update;
  if not found then
    raise exception 'marca_inexistente';
  end if;
  if not v_marca.ativa then
    raise exception 'marca_inativa';
  end if;

  select creditos into v_preco from public.precos_acoes where acao = p_acao;
  if v_preco is null then
    raise exception 'preco_inexistente';
  end if;

  v_total := v_preco * p_quantidade_itens;
  if v_total = 0 then
    return null;
  end if;
  if v_marca.saldo_creditos < v_total then
    raise exception 'saldo_insuficiente';
  end if;

  perform set_config('app.alterando_saldo', 'sim', true);
  update public.marcas set saldo_creditos = saldo_creditos - v_total where id = p_marca_id;
  perform set_config('app.alterando_saldo', 'nao', true);

  insert into public.movimentacoes_creditos (marca_id, tipo, quantidade, saldo_apos, acao, referencia_tipo, referencia_id, criado_por)
  values (p_marca_id, 'consumo', -v_total, v_marca.saldo_creditos - v_total, p_acao, p_referencia_tipo, p_referencia_id, p_criado_por)
  returning id into v_id;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- estornar_creditos — regras 11.2.4 e 11.2.5; seção 9.3.
-- Recebe: o consumo original, observação e (D-1) opcionalmente a quantidade parcial e o
--   item que falhou. Sem quantidade: estorna o valor integral do consumo.
--   Estorno parcial serve ao "gerar_video" (4 créditos por cena que falhou, 11.2.4).
-- Idempotente: levanta `ja_estornado` se aquele consumo (ou aquele item do consumo) já
--   tem estorno, ou se o total estornado passaria do valor consumido.
-- Devolve: id da movimentação de estorno.
-- -----------------------------------------------------------------------------
create function public.estornar_creditos(
  p_movimentacao_id uuid,
  p_observacao text,
  p_quantidade integer default null,
  p_referencia_tipo text default null,
  p_referencia_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_original public.movimentacoes_creditos%rowtype;
  v_saldo integer;
  v_ja_estornado integer;
  v_valor integer;
  v_id uuid;
begin
  select * into v_original from public.movimentacoes_creditos where id = p_movimentacao_id;
  if not found or v_original.tipo <> 'consumo' then
    raise exception 'consumo_inexistente';
  end if;

  -- Trava a marca primeiro: serializa estornos concorrentes do mesmo consumo.
  select saldo_creditos into v_saldo from public.marcas where id = v_original.marca_id for update;

  select coalesce(sum(quantidade), 0) into v_ja_estornado
  from public.movimentacoes_creditos
  where estorno_de_id = p_movimentacao_id;

  if p_quantidade is null then
    if v_ja_estornado > 0 then
      raise exception 'ja_estornado';
    end if;
    v_valor := -v_original.quantidade;
  else
    if p_quantidade < 1 then
      raise exception 'quantidade_invalida';
    end if;
    if exists (
      select 1 from public.movimentacoes_creditos
      where estorno_de_id = p_movimentacao_id
        and referencia_id is not distinct from p_referencia_id
    ) then
      raise exception 'ja_estornado';
    end if;
    if v_ja_estornado + p_quantidade > -v_original.quantidade then
      raise exception 'ja_estornado';
    end if;
    v_valor := p_quantidade;
  end if;

  perform set_config('app.alterando_saldo', 'sim', true);
  update public.marcas set saldo_creditos = saldo_creditos + v_valor where id = v_original.marca_id;
  perform set_config('app.alterando_saldo', 'nao', true);

  insert into public.movimentacoes_creditos (marca_id, tipo, quantidade, saldo_apos, acao, referencia_tipo, referencia_id, estorno_de_id, observacao)
  values (
    v_original.marca_id, 'estorno', v_valor, v_saldo + v_valor, v_original.acao,
    coalesce(p_referencia_tipo, v_original.referencia_tipo),
    coalesce(p_referencia_id, v_original.referencia_id),
    p_movimentacao_id, p_observacao
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- lancar_creditos — lançamento manual do admin (critério 8.2, regra 11.2.6).
-- Recebe: marca, tipo (compra | bonus | ajuste_manual), quantidade, valor pago em centavos,
--   observação, autor e (D-2) a moeda do valor pago.
-- Valida: compra exige quantidade > 0, valor > 0 e moeda; bônus exige quantidade > 0 e
--   observação; ajuste exige observação e não pode deixar saldo < 0 (`saldo_negativo`).
-- Devolve: id da movimentação.
-- -----------------------------------------------------------------------------
create function public.lancar_creditos(
  p_marca_id uuid,
  p_tipo public.tipo_movimentacao,
  p_quantidade integer,
  p_valor_pago_centavos integer,
  p_observacao text,
  p_criado_por uuid,
  p_moeda text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_saldo integer;
  v_id uuid;
  v_observacao text := nullif(btrim(p_observacao), '');
begin
  if p_tipo not in ('compra', 'bonus', 'ajuste_manual') then
    raise exception 'tipo_invalido';
  end if;
  if p_quantidade is null or p_quantidade = 0 then
    raise exception 'quantidade_invalida';
  end if;
  if p_tipo = 'compra' and (p_quantidade < 0 or coalesce(p_valor_pago_centavos, 0) <= 0 or p_moeda is null) then
    raise exception 'compra_exige_valor';
  end if;
  if p_tipo in ('bonus', 'ajuste_manual') and v_observacao is null then
    raise exception 'observacao_obrigatoria';
  end if;
  if p_tipo = 'bonus' and p_quantidade < 0 then
    raise exception 'quantidade_invalida';
  end if;

  select saldo_creditos into v_saldo from public.marcas where id = p_marca_id for update;
  if not found then
    raise exception 'marca_inexistente';
  end if;
  if v_saldo + p_quantidade < 0 then
    raise exception 'saldo_negativo';
  end if;

  perform set_config('app.alterando_saldo', 'sim', true);
  update public.marcas set saldo_creditos = saldo_creditos + p_quantidade where id = p_marca_id;
  perform set_config('app.alterando_saldo', 'nao', true);

  insert into public.movimentacoes_creditos (marca_id, tipo, quantidade, saldo_apos, valor_pago_centavos, moeda, observacao, criado_por)
  values (
    p_marca_id, p_tipo, p_quantidade, v_saldo + p_quantidade,
    case when p_tipo = 'compra' then p_valor_pago_centavos end,
    case when p_tipo = 'compra' then lower(p_moeda) end,
    v_observacao, p_criado_por
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- creditar_pagamento — seção 4.5, regra 11.2.10, máquina 12.5.
-- Recebe: pagamento, payment intent da Stripe, valor pago (amount_total) e moeda.
-- Faz: trava o pagamento; se já `pago`/`reembolsado`, devolve a movimentação existente sem
--   efeito (idempotente por Checkout Session); de `iniciado` vai a `pago`, grava pago_em,
--   insere `compra` com os créditos congelados do pagamento e soma no saldo.
--   Sair de `expirado` ou `falhou` é proibido (`transicao_invalida`).
-- Devolve: id da movimentação de compra.
-- -----------------------------------------------------------------------------
create function public.creditar_pagamento(
  p_pagamento_id uuid,
  p_stripe_payment_intent_id text,
  p_valor_centavos integer,
  p_moeda text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pag public.pagamentos%rowtype;
  v_saldo integer;
  v_id uuid;
begin
  select * into v_pag from public.pagamentos where id = p_pagamento_id for update;
  if not found then
    raise exception 'pagamento_inexistente';
  end if;
  if v_pag.status in ('pago', 'reembolsado') then
    select id into v_id from public.movimentacoes_creditos where pagamento_id = p_pagamento_id;
    return v_id;
  end if;
  if v_pag.status <> 'iniciado' then
    raise exception 'transicao_invalida';
  end if;
  if coalesce(p_valor_centavos, 0) <= 0 or p_moeda is null then
    raise exception 'compra_exige_valor';
  end if;

  update public.pagamentos
  set status = 'pago', pago_em = now(), stripe_payment_intent_id = p_stripe_payment_intent_id,
      valor_centavos = p_valor_centavos, moeda = lower(p_moeda)
  where id = p_pagamento_id;

  select saldo_creditos into v_saldo from public.marcas where id = v_pag.marca_id for update;
  perform set_config('app.alterando_saldo', 'sim', true);
  update public.marcas set saldo_creditos = saldo_creditos + v_pag.creditos where id = v_pag.marca_id;
  perform set_config('app.alterando_saldo', 'nao', true);

  insert into public.movimentacoes_creditos (marca_id, tipo, quantidade, saldo_apos, valor_pago_centavos, moeda, pagamento_id, criado_por)
  values (v_pag.marca_id, 'compra', v_pag.creditos, v_saldo + v_pag.creditos, p_valor_centavos, lower(p_moeda), p_pagamento_id, v_pag.criado_por)
  returning id into v_id;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- estornar_pagamento — `charge.refunded` com reembolso total (seção 4.5, regra 11.2.10).
-- Recebe: pagamento. Faz: marca `reembolsado` e insere `ajuste_manual` negativo de
--   min(créditos, saldo); a diferença não debitada fica em pagamentos.observacao (alerta
--   no admin). Idempotente: pagamento já reembolsado devolve nulo sem efeito.
-- Devolve: id do ajuste (nulo se nada foi debitado ou se já estava reembolsado).
-- -----------------------------------------------------------------------------
create function public.estornar_pagamento(p_pagamento_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pag public.pagamentos%rowtype;
  v_saldo integer;
  v_debito integer;
  v_id uuid;
begin
  select * into v_pag from public.pagamentos where id = p_pagamento_id for update;
  if not found then
    raise exception 'pagamento_inexistente';
  end if;
  if v_pag.status = 'reembolsado' then
    return null;
  end if;
  if v_pag.status <> 'pago' then
    raise exception 'transicao_invalida';
  end if;

  select saldo_creditos into v_saldo from public.marcas where id = v_pag.marca_id for update;
  v_debito := least(v_pag.creditos, v_saldo);

  if v_debito > 0 then
    perform set_config('app.alterando_saldo', 'sim', true);
    update public.marcas set saldo_creditos = saldo_creditos - v_debito where id = v_pag.marca_id;
    perform set_config('app.alterando_saldo', 'nao', true);

    insert into public.movimentacoes_creditos (marca_id, tipo, quantidade, saldo_apos, observacao)
    values (v_pag.marca_id, 'ajuste_manual', -v_debito, v_saldo - v_debito,
            format('Reembolso na Stripe do pagamento %s (%s créditos)', p_pagamento_id, v_pag.creditos))
    returning id into v_id;
  end if;

  update public.pagamentos
  set status = 'reembolsado',
      observacao = case
        when v_debito < v_pag.creditos then
          format('Reembolso de %s créditos: só %s debitados por falta de saldo; diferença de %s créditos já usados.',
                 v_pag.creditos, v_debito, v_pag.creditos - v_debito)
        else observacao
      end
  where id = p_pagamento_id;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- pegar_proximo_anuncio_para_montar — fila do worker (seções 4.1 e 7.5; 12.2).
-- Recebe: nada. Faz: pega 1 anúncio `montando` sem montagem em andamento (marcador D-3
--   `montagem_iniciada_em` nulo ou parado há mais de 10 min, seção 23) e com menos de 3
--   tentativas, com `for update skip locked`; zera `erro`, marca o início e soma a tentativa.
-- Devolve: id do anúncio, ou nulo se a fila está vazia.
-- -----------------------------------------------------------------------------
create function public.pegar_proximo_anuncio_para_montar()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.anuncios
  where status = 'montando'
    and tentativas_montagem < 3
    and (montagem_iniciada_em is null or montagem_iniciada_em < now() - interval '10 minutes')
  order by atualizado_em
  limit 1
  for update skip locked;

  if v_id is null then
    return null;
  end if;

  update public.anuncios
  set erro = null, montagem_iniciada_em = now(), tentativas_montagem = tentativas_montagem + 1
  where id = v_id;

  return v_id;
end;
$$;

-- Funções de crédito e fila: só o servidor (service_role) executa (seção 7.5).
revoke execute on function public.debitar_creditos(uuid, public.acao_cobravel, integer, text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.estornar_creditos(uuid, text, integer, text, uuid) from public, anon, authenticated;
revoke execute on function public.lancar_creditos(uuid, public.tipo_movimentacao, integer, integer, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.creditar_pagamento(uuid, text, integer, text) from public, anon, authenticated;
revoke execute on function public.estornar_pagamento(uuid) from public, anon, authenticated;
revoke execute on function public.pegar_proximo_anuncio_para_montar() from public, anon, authenticated;
grant execute on function public.debitar_creditos(uuid, public.acao_cobravel, integer, text, uuid, uuid) to service_role;
grant execute on function public.estornar_creditos(uuid, text, integer, text, uuid) to service_role;
grant execute on function public.lancar_creditos(uuid, public.tipo_movimentacao, integer, integer, text, uuid, text) to service_role;
grant execute on function public.creditar_pagamento(uuid, text, integer, text) to service_role;
grant execute on function public.estornar_pagamento(uuid) to service_role;
grant execute on function public.pegar_proximo_anuncio_para_montar() to service_role;

-- Funções auxiliares das políticas: só usuários autenticados (e o servidor).
revoke execute on function public.eh_admin() from public, anon;
revoke execute on function public.minha_marca_id() from public, anon;
grant execute on function public.eh_admin() to authenticated, service_role;
grant execute on function public.minha_marca_id() to authenticated, service_role;
revoke execute on function public.definir_atualizado_em() from public, anon, authenticated;
