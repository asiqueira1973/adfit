-- =============================================================================
-- AdFit — estornar_pagamento passa a ACRESCENTAR a nota em `pagamentos.observacao` em vez de
-- sobrescrever (seção 4.5: "o que não puder ser debitado fica registrado em observacao"; 12.5:
-- reembolso parcial "só registra em observacao" — a nota anterior não pode se perder).
-- Mesma assinatura e mesmo comportamento da 20261101000300 no resto.
-- Teste: apps/web/src/server/stripe/stripe.integration.test.ts ("charge.refunded total…").
-- =============================================================================

-- -----------------------------------------------------------------------------
-- estornar_pagamento — `charge.refunded` com reembolso total (seção 4.5, regra 11.2.10).
-- Recebe: pagamento. Faz: marca `reembolsado` e insere `ajuste_manual` negativo de
--   min(créditos, saldo); a diferença não debitada é ACRESCENTADA a pagamentos.observacao.
--   Idempotente: pagamento já reembolsado devolve nulo sem efeito.
-- Devolve: id do ajuste (nulo se nada foi debitado ou se já estava reembolsado).
-- -----------------------------------------------------------------------------
create or replace function public.estornar_pagamento(p_pagamento_id uuid)
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
  v_nota text;
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

  if v_debito < v_pag.creditos then
    v_nota := format('Reembolso de %s créditos: só %s debitados por falta de saldo; diferença de %s créditos já usados.',
                     v_pag.creditos, v_debito, v_pag.creditos - v_debito);
  end if;

  update public.pagamentos
  set status = 'reembolsado',
      observacao = nullif(concat_ws(' ', observacao, v_nota), '')
  where id = p_pagamento_id;

  return v_id;
end;
$$;

revoke execute on function public.estornar_pagamento(uuid) from public, anon, authenticated;
grant execute on function public.estornar_pagamento(uuid) to service_role;
