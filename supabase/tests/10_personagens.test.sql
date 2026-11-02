-- Catálogo de personagens (MD-17): RLS por marca, escrita só pelo servidor, limite de 4 fotos,
-- caminho amarrado, aprovação da ficha e preços.
begin;
\ir 00_fixture.sql.inc
select plan(12);

insert into personagens (id, marca_id, nome, genero_modelo, criado_por) values
  ('11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'Ana', 'mulher', '00000000-0000-0000-0000-0000000000a1'),
  ('11111111-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000000', 'Bia', 'mulher', '00000000-0000-0000-0000-0000000000b1');

select is((select creditos from precos_acoes where acao = 'gerar_ficha_personagem'), 2, 'ficha de personagem custa 2');
select is((select creditos from precos_acoes where acao = 'refazer_ficha_personagem'), 1, 'refazer custa 1');

-- Caminho da foto amarrado à marca e à personagem.
select throws_ok($$ insert into fotos_personagem (personagem_id, marca_id, storage_path)
  values ('11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'produtos/bbbbbbbb-0000-0000-0000-000000000000/personagens/11111111-0000-0000-0000-00000000000a/originais/1.jpg') $$,
  '23514', null, 'caminho fora da pasta da marca é recusado');
insert into fotos_personagem (personagem_id, marca_id, storage_path, ordem)
  select '11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000',
         'produtos/aaaaaaaa-0000-0000-0000-000000000000/personagens/11111111-0000-0000-0000-00000000000a/originais/' || n || '.jpg', n
  from generate_series(1, 4) n;
select throws_ok($$ insert into fotos_personagem (personagem_id, marca_id, storage_path) values ('11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000',
  'produtos/aaaaaaaa-0000-0000-0000-000000000000/personagens/11111111-0000-0000-0000-00000000000a/originais/5.jpg') $$, 'P0001', 'limite_fotos', '5ª foto recusada');

-- Aprovação da ficha.
insert into fichas_personagem (id, personagem_id, marca_id, versao, status, imagem_path) values
  ('22222222-0000-0000-0000-00000000000a', '11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 1, 'aguardando_aprovacao', 'produtos/aaaaaaaa-0000-0000-0000-000000000000/personagens/11111111-0000-0000-0000-00000000000a/fichas/v1.png');
select is(aprovar_ficha_personagem('22222222-0000-0000-0000-00000000000a'), '11111111-0000-0000-0000-00000000000a'::uuid, 'aprova e devolve a personagem');
select is((select ficha_aprovada_id from personagens where id = '11111111-0000-0000-0000-00000000000a'), '22222222-0000-0000-0000-00000000000a'::uuid, 'ficha aprovada apontada');
select throws_ok($$ insert into anuncios (marca_id, produto_id, ficha_id, criado_por, titulo, cenario, modalidade, genero_modelo, personagem_id)
  select 'aaaaaaaa-0000-0000-0000-000000000000', produto_id, ficha_id, criado_por, 't', 'academia', 'musculacao', 'mulher', '11111111-0000-0000-0000-00000000000b'
  from anuncios where marca_id = 'aaaaaaaa-0000-0000-0000-000000000000' limit 1 $$, '23503', null, 'anúncio não usa personagem de outra marca');

-- RLS: usuário da marca A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select count(*) from personagens where id in ('11111111-0000-0000-0000-00000000000a', '11111111-0000-0000-0000-00000000000b'))::int, 1, 'marca A vê só a própria personagem');
select is((select count(*) from fichas_personagem where personagem_id = '11111111-0000-0000-0000-00000000000b')::int, 0, 'não vê ficha de outra marca');
select throws_ok($$ insert into personagens (marca_id, nome, genero_modelo, criado_por) values ('aaaaaaaa-0000-0000-0000-000000000000', 'X', 'homem', '00000000-0000-0000-0000-0000000000a1') $$, '42501', null, 'cliente não cria personagem direto');
select throws_ok($$ update personagens set modelo_en = 'x' where id = '11111111-0000-0000-0000-00000000000a' $$, '42501', null, 'cliente não altera personagem direto');
select ok(pode_gravar_foto_personagem('aaaaaaaa-0000-0000-0000-000000000000/personagens/11111111-0000-0000-0000-00000000000a/originais/9.jpg')
      and not pode_gravar_foto_personagem('bbbbbbbb-0000-0000-0000-000000000000/personagens/11111111-0000-0000-0000-00000000000b/originais/9.jpg'),
  'Storage: grava foto só de personagem da própria marca');

select * from finish();
rollback;
