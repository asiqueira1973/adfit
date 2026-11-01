-- Testes das funções de crédito, pagamento e fila (seções 7.5, 11.2, 12.5 e 22).
begin;
\ir 00_fixture.sql.inc
select plan(38);

-- Saldo inicial de A = 100 (bônus da fixture).
select is((select saldo_creditos from marcas where id = 'aaaaaaaa-0000-0000-0000-000000000000'), 100, 'fixture: saldo 100');

-- ---------- Livro-razão imutável e saldo protegido ----------
select throws_ok($$ update movimentacoes_creditos set quantidade = 5 $$, 'P0001', 'livro_razao_imutavel', 'update em movimentacoes falha');
select throws_ok($$ delete from movimentacoes_creditos $$, 'P0001', 'livro_razao_imutavel', 'delete em movimentacoes falha');
select throws_ok($$ update marcas set saldo_creditos = 5 where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$, 'P0001', 'saldo_protegido', 'saldo não muda fora das funções, nem como postgres');

-- ---------- debitar_creditos ----------
select isnt(debitar_creditos('aaaaaaaa-0000-0000-0000-000000000000', 'gerar_video', 1, 'anuncio', null, null), null, 'débito devolve id');
select is((select saldo_creditos from marcas where id = 'aaaaaaaa-0000-0000-0000-000000000000'), 88, 'gerar_video debita 12');
select is((select saldo_apos from movimentacoes_creditos where marca_id = 'aaaaaaaa-0000-0000-0000-000000000000' and tipo = 'consumo' order by criado_em desc limit 1), 88, 'saldo_apos do consumo');
select is(debitar_creditos('aaaaaaaa-0000-0000-0000-000000000000', 'remontar_texto', 1, 'anuncio', null, null), null, 'preço 0 devolve nulo');
select is((select count(*) from movimentacoes_creditos where acao = 'remontar_texto'), 0::bigint, 'preço 0 não insere movimentação');
create temp table t_multi as select debitar_creditos('aaaaaaaa-0000-0000-0000-000000000000', 'refazer_quadro', 3, 'quadro', null, null) as id;
select is((select quantidade from movimentacoes_creditos where id = (select id from t_multi)), -3, 'quantidade de itens multiplica o preço');
select throws_ok($$ select debitar_creditos('aaaaaaaa-0000-0000-0000-000000000000', 'gerar_video', 10, null, null, null) $$, 'P0001', 'saldo_insuficiente', 'saldo insuficiente');
update precos_acoes set creditos = 5 where acao = 'gerar_ficha';
create temp table t_preco as select debitar_creditos('aaaaaaaa-0000-0000-0000-000000000000', 'gerar_ficha', 1, null, null, null) as id;
select is((select quantidade from movimentacoes_creditos where id = (select id from t_preco)), -5, 'preço lido no momento do débito (11.2.7)');
update marcas set ativa = false where id = 'bbbbbbbb-0000-0000-0000-000000000000';
select throws_ok($$ select debitar_creditos('bbbbbbbb-0000-0000-0000-000000000000', 'gerar_ficha', 1, null, null, null) $$, 'P0001', 'marca_inativa', 'marca inativa não debita');

-- ---------- estornar_creditos ----------
create temp table t_consumo as select debitar_creditos('aaaaaaaa-0000-0000-0000-000000000000', 'gerar_video', 1, 'anuncio', null, null) as id;
select is((select saldo_creditos from marcas where id = 'aaaaaaaa-0000-0000-0000-000000000000'), 68, 'antes do estorno: 68');
select isnt(estornar_creditos((select id from t_consumo), 'falha cena 1', 4, 'clipe', '11111111-0000-0000-0000-000000000001'), null, 'estorno parcial da cena 1 (11.2.4)');
select throws_ok(format($$ select estornar_creditos(%L, 'repetido', 4, 'clipe', '11111111-0000-0000-0000-000000000001') $$, (select id from t_consumo)), 'P0001', 'ja_estornado', 'mesma cena não estorna duas vezes');
select lives_ok(format($$ select estornar_creditos(%L, 'falha cena 2', 4, 'clipe', '11111111-0000-0000-0000-000000000002') $$, (select id from t_consumo)), 'cena 2');
select lives_ok(format($$ select estornar_creditos(%L, 'falha cena 3', 4, 'clipe', '11111111-0000-0000-0000-000000000003') $$, (select id from t_consumo)), 'cena 3');
select is((select saldo_creditos from marcas where id = 'aaaaaaaa-0000-0000-0000-000000000000'), 80, '3 cenas falhas = estorno integral de 12');
select throws_ok(format($$ select estornar_creditos(%L, 'além do total', 4, 'clipe', '11111111-0000-0000-0000-000000000004') $$, (select id from t_consumo)), 'P0001', 'ja_estornado', 'estorno não passa do valor consumido');
create temp table t_consumo2 as select debitar_creditos('aaaaaaaa-0000-0000-0000-000000000000', 'gerar_roteiro_quadros', 1, 'anuncio', null, null) as id;
select lives_ok(format($$ select estornar_creditos(%L, 'falha') $$, (select id from t_consumo2)), 'estorno integral');
select throws_ok(format($$ select estornar_creditos(%L, 'falha') $$, (select id from t_consumo2)), 'P0001', 'ja_estornado', 'estorno integral é idempotente');

-- ---------- lancar_creditos (critério 8.2, regra 11.2.6) ----------
select throws_ok($$ select lancar_creditos('aaaaaaaa-0000-0000-0000-000000000000', 'compra', 100, null, null, null, 'brl') $$, 'P0001', 'compra_exige_valor', 'compra exige valor pago');
select throws_ok($$ select lancar_creditos('aaaaaaaa-0000-0000-0000-000000000000', 'bonus', 10, null, '  ', null) $$, 'P0001', 'observacao_obrigatoria', 'bônus exige observação');
select throws_ok($$ select lancar_creditos('aaaaaaaa-0000-0000-0000-000000000000', 'ajuste_manual', -10, null, null, null) $$, 'P0001', 'observacao_obrigatoria', 'ajuste exige observação');
select throws_ok($$ select lancar_creditos('aaaaaaaa-0000-0000-0000-000000000000', 'ajuste_manual', -1000, null, 'tirar', null) $$, 'P0001', 'saldo_negativo', 'ajuste negativo não deixa saldo < 0');
insert into marcas (id, nome) values ('dddddddd-0000-0000-0000-000000000000', 'Marca nova');
select lives_ok($$ select lancar_creditos('dddddddd-0000-0000-0000-000000000000', 'compra', 100, 50000, null, null, 'BRL') $$, 'compra de 100 créditos');
select is((select saldo_creditos from marcas where id = 'dddddddd-0000-0000-0000-000000000000'), 100, 'após 100 créditos, saldo 100');
select is((select saldo_apos::int || ' ' || moeda from movimentacoes_creditos where marca_id = 'dddddddd-0000-0000-0000-000000000000'), '100 brl', 'extrato: saldo_apos 100 e moeda');

-- ---------- creditar_pagamento / estornar_pagamento (12.5, 11.2.10) ----------
create temp table t_pag as select id from pagamentos where marca_id = 'aaaaaaaa-0000-0000-0000-000000000000';
create temp table t_mov as select creditar_pagamento((select id from t_pag), 'pi_1', 3000, 'usd') as id;
select is(creditar_pagamento((select id from t_pag), 'pi_1', 3000, 'usd'), (select id from t_mov), 'creditar_pagamento repetido devolve a mesma movimentação');
select is((select count(*) from movimentacoes_creditos where pagamento_id = (select id from t_pag)), 1::bigint, 'pagamento credita uma única vez');
select is((select status::text from pagamentos where id = (select id from t_pag)), 'pago', 'pagamento vira pago');
update pagamentos set status = 'expirado' where marca_id = 'bbbbbbbb-0000-0000-0000-000000000000';
select throws_ok($$ select creditar_pagamento((select id from pagamentos where marca_id = 'bbbbbbbb-0000-0000-0000-000000000000'), 'pi_2', 3000, 'usd') $$, 'P0001', 'transicao_invalida', 'expirado não vira pago');
-- Reembolso maior que o saldo: debita até o saldo e registra a diferença.
select lancar_creditos('aaaaaaaa-0000-0000-0000-000000000000', 'ajuste_manual', -((select saldo_creditos from marcas where id = 'aaaaaaaa-0000-0000-0000-000000000000') - 20), null, 'consumo simulado', null);
select lives_ok($$ select estornar_pagamento((select id from t_pag)) $$, 'estornar_pagamento');
select is((select saldo_creditos from marcas where id = 'aaaaaaaa-0000-0000-0000-000000000000'), 0, 'reembolso limitado ao saldo disponível');
select matches((select observacao from pagamentos where id = (select id from t_pag)), 'diferença de 30', 'diferença registrada em pagamentos.observacao');
select is(estornar_pagamento((select id from t_pag)), null, 'estornar_pagamento é idempotente');

-- ---------- Consistência: soma do livro-razão = saldo ----------
select is(
  (select count(*) from marcas m where m.saldo_creditos <> coalesce((select sum(quantidade) from movimentacoes_creditos where marca_id = m.id), 0)),
  0::bigint, 'soma das movimentações = saldo em todas as marcas');

select * from finish();
rollback;
