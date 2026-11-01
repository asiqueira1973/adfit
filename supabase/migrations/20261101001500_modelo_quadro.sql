-- Emenda MD-12 (01/11/2026): imagens das cenas num modelo próprio — Marketing Studio 2.5 Flare. O Grok
-- (que segue na ficha, `modelo_imagem`) barrava como nsfw toda cena de corrida com top. Preço por uso
-- (tokens); 0.20 é a estimativa de uma imagem 2k em qualidade alta, a conferir no extrato da Higgsfield.
insert into public.configuracoes (chave, valor, descricao) values
  ('modelo_quadro', '"marketing-studio/image/flare"', 'Endpoint ID do modelo das imagens das cenas (MD-12); alternativa: xai/grok-imagine-image-2.0'),
  ('preco_usd_por_quadro', '0.20', 'Custo USD estimado por imagem de cena (Marketing Studio 2.5 Flare 2k alta; MD-12)')
on conflict (chave) do nothing;
