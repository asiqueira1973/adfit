-- Testes de RLS (critério 8.1, seção 22, matriz da seção 5 e políticas da 6.4).
begin;
\ir 00_fixture.sql.inc
select plan(32);

-- ---------- Usuária da marca A ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

-- Um teste por tabela: nenhuma linha da marca B é visível.
select is((select count(*) from marcas where id = 'bbbbbbbb-0000-0000-0000-000000000000'), 0::bigint, 'marcas: A não lê B');
select is((select count(*) from perfis where marca_id = 'bbbbbbbb-0000-0000-0000-000000000000'), 0::bigint, 'perfis: A não lê B');
select is((select count(*) from produtos where marca_id = 'bbbbbbbb-0000-0000-0000-000000000000'), 0::bigint, 'produtos: A não lê B');
select is((select count(*) from fotos_produto where marca_id = 'bbbbbbbb-0000-0000-0000-000000000000'), 0::bigint, 'fotos_produto: A não lê B');
select is((select count(*) from fichas_produto where marca_id = 'bbbbbbbb-0000-0000-0000-000000000000'), 0::bigint, 'fichas_produto: A não lê B');
select is((select count(*) from anuncios where marca_id = 'bbbbbbbb-0000-0000-0000-000000000000'), 0::bigint, 'anuncios: A não lê B');
select is((select count(*) from cenas where marca_id = 'bbbbbbbb-0000-0000-0000-000000000000'), 0::bigint, 'cenas: A não lê B');
select is((select count(*) from quadros where marca_id = 'bbbbbbbb-0000-0000-0000-000000000000'), 0::bigint, 'quadros: A não lê B');
select is((select count(*) from clipes where marca_id = 'bbbbbbbb-0000-0000-0000-000000000000'), 0::bigint, 'clipes: A não lê B');
select is((select count(*) from geracoes), 0::bigint, 'geracoes: usuário da marca não lê nenhuma (nem da própria)');
select is((select count(*) from movimentacoes_creditos where marca_id = 'bbbbbbbb-0000-0000-0000-000000000000'), 0::bigint, 'movimentacoes_creditos: A não lê B');
select is((select count(*) from pagamentos where marca_id = 'bbbbbbbb-0000-0000-0000-000000000000'), 0::bigint, 'pagamentos: A não lê B');
select is((select count(*) from configuracoes), 0::bigint, 'configuracoes: usuário da marca não lê');
select is((select count(*) from pacotes_creditos where id in ('cccccccc-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000002')), 1::bigint, 'pacotes_creditos: usuário da marca só vê o pacote ativo (não vê o inativo)');
select is((select count(*) from precos_acoes), 7::bigint, 'precos_acoes: todo autenticado lê');

-- E a própria marca continua visível.
select is((select count(*) from anuncios where marca_id = 'aaaaaaaa-0000-0000-0000-000000000000'), 1::bigint, 'anuncios: A lê os próprios');

-- Escritas.
select throws_ok($$ update marcas set saldo_creditos = 999999 where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$, '42501', null, 'usuario_marca não altera marcas.saldo_creditos');
select throws_ok($$ update marcas set ativa = false where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$, '42501', null, 'usuario_marca não altera marcas.ativa');
select lives_ok($$ update marcas set cta_padrao = 'Compre já' where id = 'aaaaaaaa-0000-0000-0000-000000000000' $$, 'usuario_marca edita o kit da própria marca');
update marcas set cta_padrao = 'invasão' where id = 'bbbbbbbb-0000-0000-0000-000000000000';
select is((select count(*) from marcas where cta_padrao = 'invasão'), 0::bigint, 'usuario_marca não edita o kit de outra marca');
select throws_ok($$ insert into produtos (marca_id, nome, categoria) values ('bbbbbbbb-0000-0000-0000-000000000000', 'x', 'top') $$, '42501', null, 'não cria produto em outra marca');
select throws_ok($$ update produtos set ficha_aprovada_id = null $$, '42501', null, 'ficha_aprovada_id só pelo servidor');
select throws_ok($$ update anuncios set status = 'pronto' $$, '42501', null, 'anuncios: cliente só altera título e arquivado');
select throws_ok($$ insert into movimentacoes_creditos (marca_id, tipo, quantidade, saldo_apos, observacao) values ('aaaaaaaa-0000-0000-0000-000000000000', 'bonus', 1000, 1000, 'x') $$, '42501', null, 'cliente não escreve no livro-razão');
select throws_ok($$ select debitar_creditos('aaaaaaaa-0000-0000-0000-000000000000', 'gerar_ficha', 1, null, null, null) $$, '42501', null, 'cliente não executa debitar_creditos');
select throws_ok($$ select lancar_creditos('aaaaaaaa-0000-0000-0000-000000000000', 'bonus', 1000, null, 'x', null) $$, '42501', null, 'cliente não executa lancar_creditos');
select throws_ok($$ select creditar_pagamento((select id from pagamentos limit 1), 'pi', 3000, 'usd') $$, '42501', null, 'cliente não executa creditar_pagamento');

-- ---------- Usuário de outro app (sem perfil) no auth compartilhado ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is((select count(*) from marcas), 0::bigint, 'usuário sem perfil não lê nenhuma marca');

-- ---------- Admin ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}', true);
select is((select count(*) from marcas where id in ('aaaaaaaa-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000')), 2::bigint, 'admin lê todas as marcas');
select is((select count(*) from geracoes), 2::bigint, 'admin lê geracoes');
select is((select count(*) from pacotes_creditos where nome = 'Pacote antigo'), 1::bigint, 'admin vê pacote inativo');

-- ---------- Anônimo ----------
reset role;
set local role anon;
select throws_ok($$ select count(*) from marcas $$, '42501', null, 'anon não lê nada');

select * from finish();
rollback;
