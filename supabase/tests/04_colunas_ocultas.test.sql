-- Princípio 5 e seção 5: prompt, payload e detalhes técnicos nunca chegam ao usuario_marca,
-- nem pela API REST do Supabase. A RLS (6.4) libera as linhas da própria marca; os GRANTs de
-- coluna escondem os campos técnicos. O admin lê esses campos pelo servidor (service_role).
begin;
\ir 00_fixture.sql.inc
select plan(7);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select throws_ok($$ select prompt_quadro from cenas $$, '42501', null, 'cenas.prompt_quadro oculto');
select throws_ok($$ select prompt_movimento from cenas $$, '42501', null, 'cenas.prompt_movimento oculto');
select throws_ok($$ select roteiro from anuncios $$, '42501', null, 'anuncios.roteiro oculto');
select throws_ok($$ select prompt_versao from anuncios $$, '42501', null, 'anuncios.prompt_versao oculto');
select throws_ok($$ select qc_detalhe from quadros $$, '42501', null, 'quadros.qc_detalhe oculto');
-- O que a interface precisa continua legível.
select lives_ok($$ select id, descricao, texto_tela, quadro_atual_id from cenas $$, 'cenas: campos de interface legíveis');
select lives_ok($$ select id, titulo, status, video_final_path, versao_montagem from anuncios $$, 'anuncios: campos de interface legíveis');

select * from finish();
rollback;
