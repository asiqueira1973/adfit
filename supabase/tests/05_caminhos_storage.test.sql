-- Isolamento por caminho (seção 6.4: todo caminho começa com <marca_id>/; cliente só grava em
-- marcas/<marca>/logo/* e produtos/<marca>/<produto>/originais/*). Achado do verifier do 8.3:
-- sem amarrar o caminho à linha, um usuário apontava sua foto/logo para arquivos de outra marca
-- e o servidor (service_role) assinava, baixava ou apagava esses arquivos.
begin;
\ir 00_fixture.sql.inc
select plan(8);

-- Produto e foto da marca A (para referência).
create temp table t_a as
  select p.id as produto, p.marca_id as marca from produtos p where p.marca_id = 'aaaaaaaa-0000-0000-0000-000000000000';
grant select on t_a to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);

-- fotos_produto.storage_path precisa ser da própria marca e do próprio produto.
select throws_ok(
  $$ insert into fotos_produto (produto_id, marca_id, storage_path, ordem)
     select p.id, p.marca_id, 'produtos/' || (select marca from t_a) || '/' || (select produto from t_a) || '/originais/1.jpg', 2
     from produtos p where p.marca_id = 'bbbbbbbb-0000-0000-0000-000000000000' $$,
  '23514', null, 'foto não pode apontar para arquivo de outra marca');
select throws_ok(
  $$ insert into fotos_produto (produto_id, marca_id, storage_path, ordem)
     select p.id, p.marca_id, 'produtos/' || p.marca_id || '/' || p.id || '/outra-pasta/1.jpg', 2
     from produtos p where p.marca_id = 'bbbbbbbb-0000-0000-0000-000000000000' $$,
  '23514', null, 'foto só na pasta originais do próprio produto');

-- marcas.logo_path precisa estar na pasta da própria marca.
select throws_ok(
  $$ update marcas set logo_path = 'aaaaaaaa-0000-0000-0000-000000000000/logo/x.png' where id = 'bbbbbbbb-0000-0000-0000-000000000000' $$,
  '23514', null, 'logo não pode apontar para arquivo de outra marca');
select lives_ok(
  $$ update marcas set logo_path = 'bbbbbbbb-0000-0000-0000-000000000000/logo/x.png' where id = 'bbbbbbbb-0000-0000-0000-000000000000' $$,
  'logo na própria pasta é aceito');

-- Storage: 2º segmento precisa ser produto da própria marca.
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('produtos', 'bbbbbbbb-0000-0000-0000-000000000000/' || (select produto from t_a) || '/originais/x.jpg') $$,
  '42501', null, 'não grava original na pasta de produto de outra marca');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     select 'produtos', p.marca_id || '/' || p.id || '/originais/ok.jpg' from produtos p where p.marca_id = 'bbbbbbbb-0000-0000-0000-000000000000' $$,
  'grava original no próprio produto sem ficha aprovada');
reset role;

-- Com ficha aprovada, originais ficam congelados também no Storage (seção 7.4).
update produtos set ficha_aprovada_id = (select id from fichas_produto where marca_id = 'bbbbbbbb-0000-0000-0000-000000000000') where marca_id = 'bbbbbbbb-0000-0000-0000-000000000000';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     select 'produtos', p.marca_id || '/' || p.id || '/originais/depois.jpg' from produtos p where p.marca_id = 'bbbbbbbb-0000-0000-0000-000000000000' $$,
  '42501', null, 'não grava original depois da ficha aprovada');
reset role;
-- (Apagar pela API de Storage depois da ficha aprovada: apps/web/src/server/products/storage-isolation.integration.test.ts.)

-- Dados existentes (fixture) seguem o formato da 7.3.
select is((select count(*) from fotos_produto where storage_path !~ '^produtos/[0-9a-f-]{36}/[0-9a-f-]{36}/originais/[^/]+$'), 0::bigint, 'todas as fotos no formato da 7.3');

select * from finish();
rollback;
