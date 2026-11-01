-- Downloads de anúncio (métrica da seção 21: anúncios baixados por semana): só o servidor grava; só o admin lê.
begin;
\ir 00_fixture.sql.inc
select plan(5);

select has_table('public', 'downloads_anuncio', 'tabela de downloads existe');
insert into downloads_anuncio (anuncio_id, marca_id)
  select id, marca_id from anuncios where marca_id = 'aaaaaaaa-0000-0000-0000-000000000000' limit 1;
select throws_ok($$ insert into downloads_anuncio (anuncio_id, marca_id)
  select id, 'bbbbbbbb-0000-0000-0000-000000000000' from anuncios where marca_id = 'aaaaaaaa-0000-0000-0000-000000000000' limit 1 $$,
  '23503', null, 'marca do download precisa ser a do anúncio');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select count(*) from downloads_anuncio where marca_id = 'aaaaaaaa-0000-0000-0000-000000000000')::int, 0, 'usuário de marca não lê downloads');
select throws_ok($$ insert into downloads_anuncio (anuncio_id, marca_id) select id, marca_id from anuncios limit 1 $$, '42501', null, 'cliente não grava download');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}', true);
select is((select count(*) from downloads_anuncio where marca_id = 'aaaaaaaa-0000-0000-0000-000000000000')::int, 1, 'admin lê');

select * from finish();
rollback;
