-- =============================================================================
-- AdFit — catálogo de personagens (emenda MD-17, plans/I-2-personagens.md), parte 1: valores de
-- enum (precisam de transação própria antes de serem usados na parte 2).
-- =============================================================================
alter type public.tipo_geracao add value if not exists 'ficha_personagem';
alter type public.acao_cobravel add value if not exists 'gerar_ficha_personagem';
alter type public.acao_cobravel add value if not exists 'refazer_ficha_personagem';
create type public.origem_personagem as enum ('descricao', 'fotos', 'anuncio');
