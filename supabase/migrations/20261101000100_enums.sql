-- =============================================================================
-- AdFit — enums (seção 7.2 do spec, valores e ordem exatos)
-- + enum `idioma` da emenda MD-1 (docs/mudancas-de-escopo.md).
-- =============================================================================

-- Perfis de usuário (seção 5).
create type public.papel_usuario as enum ('admin_plataforma', 'usuario_marca');

-- Categoria da peça cadastrada (seção 7.3, produtos.categoria).
create type public.categoria_peca as enum ('top', 'legging', 'shorts', 'camiseta', 'regata', 'jaqueta', 'conjunto', 'outro');

-- Público da peça; sugere o gênero do modelo no anúncio (critério 8.5).
create type public.genero_alvo as enum ('feminino', 'masculino', 'unissex');

-- Máquina de estados da ficha de produto (seção 12.1).
create type public.status_ficha as enum ('gerando', 'aguardando_aprovacao', 'aprovada', 'descartada', 'falhou');

-- Máquina de estados do anúncio (seção 12.2).
create type public.status_anuncio as enum ('gerando_roteiro', 'gerando_quadros', 'aguardando_aprovacao', 'gerando_clipes', 'montando', 'pronto', 'falhou');

-- Estado de quadros e clipes (seção 12.4).
create type public.status_item as enum ('gerando', 'pronto', 'descartado', 'falhou');

-- Estado de uma chamada à Higgsfield (seção 12.3).
create type public.status_geracao as enum ('na_fila', 'processando', 'concluida', 'falhou', 'bloqueada_nsfw');

-- Tipo de geração na Higgsfield.
create type public.tipo_geracao as enum ('ficha_produto', 'quadro_chave', 'clipe_video');

-- Opções do anúncio (seção 11.4).
create type public.cenario as enum ('academia', 'box_crossfit', 'estudio_funcional', 'ao_ar_livre_urbano', 'ao_ar_livre_natureza', 'pista_de_corrida');
create type public.modalidade as enum ('musculacao', 'crossfit', 'hyrox', 'corrida', 'funcional', 'yoga_pilates');
create type public.genero_modelo as enum ('mulher', 'homem');
create type public.faixa_etaria as enum ('de_20_a_30', 'de_30_a_45', 'acima_de_45');
create type public.estilo_video as enum ('energetico', 'cinematografico', 'lifestyle');
create type public.formato_video as enum ('vertical_9_16', 'horizontal_16_9');

-- Livro-razão de créditos (seção 7.3, movimentacoes_creditos.tipo).
create type public.tipo_movimentacao as enum ('compra', 'bonus', 'consumo', 'estorno', 'ajuste_manual');

-- Ações cobradas em créditos (regra 11.1).
create type public.acao_cobravel as enum ('gerar_ficha', 'refazer_ficha', 'gerar_roteiro_quadros', 'refazer_quadro', 'gerar_video', 'refazer_clipe', 'remontar_texto');

-- Estado de um pagamento da Stripe (seção 12.5).
create type public.status_pagamento as enum ('iniciado', 'pago', 'falhou', 'expirado', 'reembolsado');

-- Emenda MD-1: idioma da interface (perfis.idioma) e do texto do vídeo (marcas.idioma_anuncios).
create type public.idioma as enum ('pt_br', 'en');
