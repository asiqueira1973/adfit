-- =============================================================================
-- AdFit — ficha de produto (épico 8.4; seções 7.3, 12.1 e 13).
--   1. No máximo uma ficha `gerando` por produto (seção 13: "nenhuma ficha gerando"), mesmo com
--      dois cliques simultâneos — o servidor estorna o débito se o índice recusar.
--   2. aprovar_ficha(): aprovação atômica (12.1 e 13).
--   3. Índice para a varredura de gerações paradas (seção 4.3: polling de reserva; 12.3: timeout).
-- Teste: supabase/tests/06_fichas.test.sql.
-- =============================================================================

-- fichas_produto_uma_gerando_uidx — uma ficha em geração por produto (seção 13).
create unique index fichas_produto_uma_gerando_uidx on public.fichas_produto (produto_id) where status = 'gerando';

-- geracoes_status_criado_em_idx — varredura de gerações `processando` paradas (seção 4.3 e 12.3).
create index geracoes_status_criado_em_idx on public.geracoes (status, criado_em);

-- -----------------------------------------------------------------------------
-- aprovar_ficha(ficha) — aprova uma versão da ficha (seção 13, critério 8.4).
-- Recebe: id da ficha. Faz, numa transação: confere status `aguardando_aprovacao`, `aprovada` ou
--   `descartada` com imagem (voltar para versão anterior é grátis); marca `aprovada`; as demais
--   versões do produto que não estão `gerando` nem `falhou` viram `descartada` (12.1); define
--   produtos.ficha_aprovada_id. Idempotente para a ficha já aprovada.
-- Devolve: o id do produto. Erros: ficha_inexistente, transicao_invalida.
-- -----------------------------------------------------------------------------
create function public.aprovar_ficha(p_ficha_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ficha public.fichas_produto%rowtype;
begin
  select * into v_ficha from public.fichas_produto where id = p_ficha_id;
  if not found then
    raise exception 'ficha_inexistente';
  end if;
  -- Trava o produto: serializa aprovações concorrentes de versões diferentes.
  perform 1 from public.produtos where id = v_ficha.produto_id for update;
  select * into v_ficha from public.fichas_produto where id = p_ficha_id for update;

  if v_ficha.status not in ('aguardando_aprovacao', 'aprovada', 'descartada') or v_ficha.imagem_path is null then
    raise exception 'transicao_invalida';
  end if;

  update public.fichas_produto set status = 'aprovada' where id = p_ficha_id;
  update public.fichas_produto set status = 'descartada'
  where produto_id = v_ficha.produto_id and id <> p_ficha_id and status in ('aguardando_aprovacao', 'aprovada');
  update public.produtos set ficha_aprovada_id = p_ficha_id where id = v_ficha.produto_id;

  return v_ficha.produto_id;
end;
$$;

revoke execute on function public.aprovar_ficha(uuid) from public, anon, authenticated;
grant execute on function public.aprovar_ficha(uuid) to service_role;
