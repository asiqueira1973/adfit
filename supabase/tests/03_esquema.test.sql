-- Testes de estrutura: nomes exatos das seções 7 e 6.4, triggers, fotos e fila do worker.
begin;
\ir 00_fixture.sql.inc
select plan(32);

select tables_are('public', array[
  'marcas', 'perfis', 'produtos', 'fotos_produto', 'fichas_produto', 'anuncios', 'cenas', 'quadros', 'clipes',
  'geracoes', 'movimentacoes_creditos', 'pacotes_creditos', 'pagamentos', 'precos_acoes', 'configuracoes',
  'feedbacks', 'pedidos_convite'
], 'tabelas da seção 7.3 (+ feedbacks, MD-6; + pedidos_convite, MD-9)');

select enums_are('public', array[
  'papel_usuario', 'categoria_peca', 'genero_alvo', 'status_ficha', 'status_anuncio', 'status_item', 'status_geracao',
  'tipo_geracao', 'cenario', 'modalidade', 'genero_modelo', 'faixa_etaria', 'estilo_video', 'formato_video',
  'tipo_movimentacao', 'acao_cobravel', 'status_pagamento', 'idioma', 'feedback_tipo', 'feedback_status', 'pedido_convite_status'
], 'enums da seção 7.2 (+ idioma, MD-1; + feedback_tipo/feedback_status, MD-6; + pedido_convite_status, MD-9)');

select has_function('public', f, 'função ' || f) from unnest(array[
  'eh_admin', 'minha_marca_id', 'debitar_creditos', 'estornar_creditos', 'lancar_creditos',
  'creditar_pagamento', 'estornar_pagamento', 'pegar_proximo_anuncio_para_montar', 'definir_atualizado_em'
]) f;

select has_trigger('public', t[1], t[2], 'trigger ' || t[2]) from (values
  (array['movimentacoes_creditos', 'trg_movimentacoes_imutaveis']),
  (array['fotos_produto', 'trg_fotos_produto_limite']),
  (array['marcas', 'trg_marcas_atualizado_em']),
  (array['produtos', 'trg_produtos_atualizado_em']),
  (array['anuncios', 'trg_anuncios_atualizado_em']),
  (array['pacotes_creditos', 'trg_pacotes_creditos_atualizado_em']),
  (array['pagamentos', 'trg_pagamentos_atualizado_em']),
  (array['marcas', 'trg_marcas_proteger_saldo'])
) v(t);

select policies_are('public', 'marcas', array['marcas_select', 'marcas_update_kit']);
select policies_are('public', 'produtos', array['produtos_select', 'produtos_insert', 'produtos_update']);
select policies_are('public', 'fotos_produto', array['fotos_select', 'fotos_insert', 'fotos_delete']);
select policies_are('public', 'anuncios', array['anuncios_select', 'anuncios_update_basico']);
select has_check('public', 'perfis', 'perfis_marca_obrigatoria_chk existe');
select throws_ok($$ insert into perfis (id, papel, nome, email) values ('00000000-0000-0000-0000-0000000000c1', 'usuario_marca', 'x', 'c@teste.dev') $$, '23514', null, 'usuario_marca sem marca é inválido');

-- trg_fotos_produto_limite: a 5ª foto é bloqueada.
insert into fotos_produto (produto_id, marca_id, storage_path, ordem)
select p.id, p.marca_id, 'produtos/' || p.marca_id || '/' || p.id || '/originais/' || g || '.jpg', g from produtos p, generate_series(2, 4) g where p.marca_id = 'aaaaaaaa-0000-0000-0000-000000000000';
select throws_ok($$ insert into fotos_produto (produto_id, marca_id, storage_path, ordem) select id, marca_id, 'produtos/' || marca_id || '/' || id || '/originais/5.jpg', 4 from produtos where marca_id = 'aaaaaaaa-0000-0000-0000-000000000000' $$, 'P0001', 'limite_fotos', '5ª foto bloqueada');

-- Foto nova não entra depois da ficha aprovada (fotos_insert).
update produtos set ficha_aprovada_id = (select id from fichas_produto where marca_id = 'bbbbbbbb-0000-0000-0000-000000000000') where marca_id = 'bbbbbbbb-0000-0000-0000-000000000000';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select throws_ok($$ insert into fotos_produto (produto_id, marca_id, storage_path, ordem) select id, marca_id, 'produtos/' || marca_id || '/' || id || '/originais/2b.jpg', 2 from produtos $$, '42501', null, 'sem foto nova com ficha aprovada');
reset role;

-- Usuário desativado perde o escopo da marca (seção 6.3).
update perfis set ativo = false where id = '00000000-0000-0000-0000-0000000000b1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select is((select count(*) from marcas), 0::bigint, 'usuário desativado não lê a marca');
reset role;

-- pegar_proximo_anuncio_para_montar: pega uma vez; com montagem em andamento não pega de novo.
update anuncios set status = 'montando' where marca_id = 'aaaaaaaa-0000-0000-0000-000000000000';
select is(pegar_proximo_anuncio_para_montar(), (select id from anuncios where marca_id = 'aaaaaaaa-0000-0000-0000-000000000000'), 'worker pega o anúncio montando');
select is(pegar_proximo_anuncio_para_montar(), null, 'montagem em andamento não é pega de novo');
update anuncios set montagem_iniciada_em = now() - interval '11 minutes', tentativas_montagem = 3 where marca_id = 'aaaaaaaa-0000-0000-0000-000000000000';
select is(pegar_proximo_anuncio_para_montar(), null, 'depois de 3 tentativas não tenta mais');

-- Buckets privados (seção 6.4).
select is((select count(*) from storage.buckets where id in ('marcas', 'produtos', 'anuncios') and not public), 3::bigint, 'buckets privados');

select * from finish();
rollback;
