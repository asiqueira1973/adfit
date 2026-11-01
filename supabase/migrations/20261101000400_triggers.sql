-- =============================================================================
-- AdFit — triggers (seção 7.5).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- trg_*_atualizado_em — mantêm `atualizado_em` nas tabelas que o têm (seção 7.5).
-- -----------------------------------------------------------------------------
create trigger trg_marcas_atualizado_em before update on public.marcas
  for each row execute function public.definir_atualizado_em();
create trigger trg_produtos_atualizado_em before update on public.produtos
  for each row execute function public.definir_atualizado_em();
create trigger trg_anuncios_atualizado_em before update on public.anuncios
  for each row execute function public.definir_atualizado_em();
create trigger trg_pacotes_creditos_atualizado_em before update on public.pacotes_creditos
  for each row execute function public.definir_atualizado_em();
create trigger trg_pagamentos_atualizado_em before update on public.pagamentos
  for each row execute function public.definir_atualizado_em();

-- -----------------------------------------------------------------------------
-- trg_movimentacoes_imutaveis — livro-razão append-only (seção 7.5, critério 8.1).
-- Dispara: antes de update ou delete em movimentacoes_creditos. Faz: levanta erro sempre.
-- -----------------------------------------------------------------------------
create function public.bloquear_alteracao_movimentacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'livro_razao_imutavel';
end;
$$;

create trigger trg_movimentacoes_imutaveis before update or delete on public.movimentacoes_creditos
  for each row execute function public.bloquear_alteracao_movimentacao();

-- -----------------------------------------------------------------------------
-- trg_fotos_produto_limite — máximo 4 fotos por produto (seção 7.3, critério 8.3).
-- Dispara: antes de insert em fotos_produto. Faz: trava o produto e bloqueia a 5ª foto
--   com `limite_fotos` (a trava evita duas inserções simultâneas passarem do limite).
-- -----------------------------------------------------------------------------
create function public.limitar_fotos_produto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.produtos where id = new.produto_id for update;
  if (select count(*) from public.fotos_produto where produto_id = new.produto_id) >= 4 then
    raise exception 'limite_fotos';
  end if;
  return new;
end;
$$;

create trigger trg_fotos_produto_limite before insert on public.fotos_produto
  for each row execute function public.limitar_fotos_produto();

-- -----------------------------------------------------------------------------
-- trg_marcas_proteger_saldo — saldo só muda pelas funções de crédito (seção 7.5, 8.1).
-- Dispara: antes de update em marcas. Faz: se saldo_creditos mudou e a variável de sessão
--   `app.alterando_saldo` não é 'sim' (setada só pelas funções da 7.5), levanta erro.
-- -----------------------------------------------------------------------------
create function public.proteger_saldo_marca()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.saldo_creditos is distinct from old.saldo_creditos
     and coalesce(current_setting('app.alterando_saldo', true), '') <> 'sim' then
    raise exception 'saldo_protegido';
  end if;
  return new;
end;
$$;

create trigger trg_marcas_proteger_saldo before update on public.marcas
  for each row execute function public.proteger_saldo_marca();

revoke execute on function public.bloquear_alteracao_movimentacao() from public, anon, authenticated;
revoke execute on function public.limitar_fotos_produto() from public, anon, authenticated;
revoke execute on function public.proteger_saldo_marca() from public, anon, authenticated;
