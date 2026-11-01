-- =============================================================================
-- AdFit — esconde do cliente as colunas técnicas (princípio 5; seção 5: "Ver prompts, modelo
-- usado, payload de geração ❌ para usuario_marca").
-- A RLS da 6.4 libera as LINHAS da própria marca; estes GRANTs de coluna impedem que a API
-- REST do Supabase (chave anon + JWT do usuário) devolva prompts, roteiro e detalhes do QC.
-- O admin lê essas colunas pelo servidor com service_role (telas [Admin]).
-- Teste: supabase/tests/04_colunas_ocultas.test.sql.
-- =============================================================================

-- anuncios: sem roteiro (prompts), prompt_versao, erro (mensagem técnica) e controle do worker.
revoke select on public.anuncios from authenticated;
grant select (
  id, marca_id, produto_id, ficha_id, criado_por, titulo, cenario, modalidade, genero_modelo, faixa_etaria,
  estilo, formato, com_texto, texto_oferta, observacoes, status, video_final_path, versao_montagem,
  arquivado, criado_em, atualizado_em
) on public.anuncios to authenticated;

-- cenas: sem prompt_quadro e prompt_movimento.
revoke select on public.cenas from authenticated;
grant select (
  id, anuncio_id, marca_id, ordem, descricao, texto_tela, quadro_atual_id, clipe_atual_id, criado_em
) on public.cenas to authenticated;

-- quadros: sem qc_detalhe (notas e motivo técnico do QC); qc_aprovado fica para o aviso da 8.5.
revoke select on public.quadros from authenticated;
grant select (
  id, cena_id, marca_id, versao, status, imagem_path, geracao_id, instrucao_refacao, qc_aprovado, criado_em
) on public.quadros to authenticated;
