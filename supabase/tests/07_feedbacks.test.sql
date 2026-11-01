-- Feedback (emenda MD-6): cada usuário cria e lê só os próprios; admin lê todos e muda o status;
-- ninguém apaga nem muda o texto.
begin;
\ir 00_fixture.sql.inc
select plan(10);

-- Usuária A envia um feedback.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$ insert into feedbacks (usuario_id, marca_id, tipo, texto, tela)
  values ('00000000-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000000', 'problema', 'Botão não funciona', '/produtos') $$,
  'usuária cria feedback em nome próprio');
select throws_ok($$ insert into feedbacks (usuario_id, marca_id, tipo, texto)
  values ('00000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000000', 'sugestao', 'Fingindo ser B') $$,
  '42501', null, 'não cria em nome de outro usuário');
select throws_ok($$ insert into feedbacks (usuario_id, marca_id, tipo, texto)
  values ('00000000-0000-0000-0000-0000000000a1', 'bbbbbbbb-0000-0000-0000-000000000000', 'sugestao', 'Outra marca') $$,
  '42501', null, 'não cria com marca de outra pessoa');
select throws_ok($$ insert into feedbacks (usuario_id, marca_id, tipo, texto, status)
  values ('00000000-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000000', 'sugestao', 'Já resolvido', 'resolvido') $$,
  '42501', null, 'não escolhe o status');
select is((select count(*) from feedbacks where texto = 'Botão não funciona')::int, 1, 'lê o próprio');
with u as (update feedbacks set status = 'resolvido' where texto = 'Botão não funciona' returning 1)
select is((select count(*) from u)::int, 0, 'usuária não muda status');

-- Usuário B não vê o feedback da A.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select is((select count(*) from feedbacks where texto = 'Botão não funciona')::int, 0, 'outra marca não lê');

-- Admin lê e muda o status, mas não apaga nem edita o texto.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}', true);
with u as (update feedbacks set status = 'visto' where texto = 'Botão não funciona' returning status::text)
select is((select status from u), 'visto', 'admin muda o status');
select throws_ok($$ update feedbacks set texto = 'editado' where texto = 'Botão não funciona' $$, '42501', null, 'texto não é editável');
select throws_ok($$ delete from feedbacks $$, '42501', null, 'ninguém apaga feedback');

select * from finish();
rollback;
