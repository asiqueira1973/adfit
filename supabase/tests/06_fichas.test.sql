-- Ficha de produto (épico 8.4; seções 12.1 e 13): uma ficha `gerando` por produto e
-- aprovar_ficha() atômica, inclusive voltar para uma versão anterior.
begin;
\ir 00_fixture.sql.inc
select plan(10);

create temp table t_p as
  select p.id as produto, p.marca_id as marca, f.id as ficha1
  from produtos p join fichas_produto f on f.produto_id = p.id
  where p.marca_id = 'aaaaaaaa-0000-0000-0000-000000000000';

-- v1 ganha imagem; v2 e v3 entram depois.
update fichas_produto set imagem_path = 'produtos/x/v1.png' where id = (select ficha1 from t_p);
insert into fichas_produto (produto_id, marca_id, versao, status, imagem_path)
  select produto, marca, 2, 'aguardando_aprovacao', 'produtos/x/v2.png' from t_p;
insert into fichas_produto (produto_id, marca_id, versao, status)
  select produto, marca, 3, 'gerando' from t_p;

-- Uma só `gerando` por produto (seção 13).
select throws_ok(
  $$ insert into fichas_produto (produto_id, marca_id, versao, status) select produto, marca, 4, 'gerando' from t_p $$,
  '23505', null, 'segunda ficha gerando no mesmo produto é recusada');

-- Aprovar v2: produto aponta para v2, v1 vira descartada, v3 (gerando) não é tocada.
select is(aprovar_ficha((select id from fichas_produto where versao = 2 and produto_id = (select produto from t_p))),
          (select produto from t_p), 'aprovar_ficha devolve o produto');
select is((select ficha_aprovada_id from produtos where id = (select produto from t_p)),
          (select id from fichas_produto where versao = 2 and produto_id = (select produto from t_p)), 'ficha_aprovada_id = v2');
select is((select status::text from fichas_produto where id = (select ficha1 from t_p)), 'descartada', 'v1 vira descartada');
select is((select status::text from fichas_produto where versao = 3 and produto_id = (select produto from t_p)), 'gerando', 'v3 gerando não muda');

-- Voltar para a v1 (descartada com imagem) é permitido e descarta a v2.
select lives_ok($$ select aprovar_ficha((select ficha1 from t_p)) $$, 'aprovar versão anterior (descartada com imagem)');
select is((select status::text from fichas_produto where versao = 2 and produto_id = (select produto from t_p)), 'descartada', 'v2 vira descartada');

-- Ficha sem imagem (gerando) não pode ser aprovada.
select throws_ok($$ select aprovar_ficha((select id from fichas_produto where versao = 3 and produto_id = (select produto from t_p))) $$,
  'P0001', 'transicao_invalida', 'ficha gerando/sem imagem recusada');
select throws_ok($$ select aprovar_ficha('00000000-0000-0000-0000-000000000000') $$, 'P0001', 'ficha_inexistente', 'ficha inexistente');

-- Cliente não executa a função (só service_role, pelo servidor).
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok($$ select aprovar_ficha((select ficha1 from t_p)) $$, '42501', null, 'authenticated não executa aprovar_ficha');

select * from finish();
rollback;
