-- Pedidos de convite (MD-9): só o admin lê e muda status; cliente não grava; um pedido aberto por e-mail.
begin;
\ir 00_fixture.sql.inc
select plan(6);

insert into pedidos_convite (nome, email, marca) values ('Ana', 'ana@loja.test', 'Loja da Ana');
select throws_ok($$ insert into pedidos_convite (nome, email, marca) values ('Ana de novo', 'ANA@loja.test', 'Loja') $$,
  '23505', null, 'um pedido em aberto por e-mail (sem diferenciar maiúsculas)');
select throws_ok($$ insert into pedidos_convite (nome, email, marca) values ('X', 'sem-arroba', 'Y') $$, '23514', null, 'e-mail inválido recusado');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select count(*) from pedidos_convite where email = 'ana@loja.test')::int, 0, 'usuário de marca não lê pedidos');
select throws_ok($$ insert into pedidos_convite (nome, email, marca) values ('Z', 'z@loja.test', 'Z') $$, '42501', null, 'cliente não grava pedido');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}', true);
select is((select count(*) from pedidos_convite where email = 'ana@loja.test')::int, 1, 'admin lê');
with u as (update pedidos_convite set status = 'convidado' where email = 'ana@loja.test' returning status::text)
select is((select status from u), 'convidado', 'admin muda o status');

select * from finish();
rollback;
