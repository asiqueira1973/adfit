-- Fixture comum dos testes de banco (incluída com \ir). Cria duas marcas (A e B), um
-- usuário de cada, um admin e uma linha de cada tabela para cada marca, como postgres.
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

insert into auth.users (id, instance_id, aud, role, email) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@teste.dev'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@teste.dev'),
  ('00000000-0000-0000-0000-0000000000ad', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@teste.dev'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outroapp@teste.dev');

insert into marcas (id, nome, instagram) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Marca A', 'marca_a'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Marca B', 'marca_b');

insert into perfis (id, marca_id, papel, nome, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000000', 'usuario_marca', 'Usuária A', 'a@teste.dev'),
  ('00000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000000', 'usuario_marca', 'Usuário B', 'b@teste.dev'),
  ('00000000-0000-0000-0000-0000000000ad', null, 'admin_plataforma', 'Admin', 'admin@teste.dev');

insert into precos_acoes (acao, creditos, descricao) values
  ('gerar_ficha', 2, 'Gerar ficha do produto'), ('refazer_ficha', 1, 'Refazer ficha'),
  ('gerar_roteiro_quadros', 2, 'Criar anúncio'), ('refazer_quadro', 1, 'Refazer imagem da cena'),
  ('gerar_video', 12, 'Gerar vídeo'), ('refazer_clipe', 4, 'Refazer cena em vídeo'),
  ('remontar_texto', 0, 'Atualizar vídeo')
on conflict (acao) do nothing;
insert into configuracoes (chave, valor, descricao) values ('teste', '1', 'teste') on conflict do nothing;
insert into pacotes_creditos (id, nome, creditos, preco_centavos, moeda, stripe_price_id, ativo) values
  ('cccccccc-0000-0000-0000-000000000001', 'Pacote 50', 50, 3000, 'usd', 'price_teste_50', true),
  ('cccccccc-0000-0000-0000-000000000002', 'Pacote antigo', 10, 1000, 'usd', 'price_teste_old', false);

-- Uma linha de cada tabela por marca (A = sufixo a, B = sufixo b).
do $$
declare
  m record;
  v_prod uuid; v_ger uuid; v_ficha uuid; v_anu uuid; v_cena uuid; v_quad uuid; v_pag uuid;
begin
  for m in select * from (values
      ('aaaaaaaa-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-0000000000a1'::uuid),
      ('bbbbbbbb-0000-0000-0000-000000000000'::uuid, '00000000-0000-0000-0000-0000000000b1'::uuid)) t(marca, usuario)
  loop
    perform lancar_creditos(m.marca, 'bonus', 100, null, 'saldo de teste', null);
    insert into produtos (marca_id, nome, categoria) values (m.marca, 'Top', 'top') returning id into v_prod;
    insert into fotos_produto (produto_id, marca_id, storage_path) values (v_prod, m.marca, 'produtos/' || m.marca || '/' || v_prod || '/originais/1.jpg');
    insert into geracoes (marca_id, tipo, modelo, entrada) values (m.marca, 'ficha_produto', 'modelo', '{}') returning id into v_ger;
    insert into fichas_produto (produto_id, marca_id, versao, status, geracao_id) values (v_prod, m.marca, 1, 'aguardando_aprovacao', v_ger) returning id into v_ficha;
    insert into anuncios (marca_id, produto_id, ficha_id, criado_por, titulo, cenario, modalidade, genero_modelo)
      values (m.marca, v_prod, v_ficha, m.usuario, 'Anúncio', 'academia', 'musculacao', 'mulher') returning id into v_anu;
    insert into cenas (anuncio_id, marca_id, ordem, descricao, prompt_quadro, prompt_movimento)
      values (v_anu, m.marca, 1, 'Cena', 'p', 'm') returning id into v_cena;
    insert into quadros (cena_id, marca_id, versao) values (v_cena, m.marca, 1) returning id into v_quad;
    insert into clipes (cena_id, marca_id, quadro_id, versao) values (v_cena, m.marca, v_quad, 1);
    insert into pagamentos (marca_id, pacote_id, criado_por, creditos, valor_centavos, moeda)
      values (m.marca, 'cccccccc-0000-0000-0000-000000000001', m.usuario, 50, 3000, 'usd') returning id into v_pag;
  end loop;
end $$;
