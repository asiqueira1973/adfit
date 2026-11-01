-- =============================================================================
-- AdFit — seed (seção 7.6). Idempotente (on conflict). Admin e pacotes entram por
-- scripts/seed-admin.ts, que lê SEED_ADMIN_* e SEED_STRIPE_PRICE_* das variáveis de ambiente.
-- =============================================================================

-- Preços por ação (regra 11.1, com gerar_video e refazer_clipe da emenda MD-4).
insert into public.precos_acoes (acao, creditos, descricao) values
  ('gerar_ficha', 2, 'Gerar ficha do produto'),
  ('refazer_ficha', 1, 'Refazer ficha'),
  ('gerar_roteiro_quadros', 2, 'Criar anúncio'),
  ('refazer_quadro', 1, 'Refazer imagem da cena'),
  ('gerar_video', 45, 'Gerar vídeo'),
  ('refazer_clipe', 15, 'Refazer cena em vídeo'),
  ('remontar_texto', 0, 'Atualizar vídeo')
on conflict (acao) do nothing;

-- Configurações (regra 11.6). Endpoints e preços da Higgsfield confirmados pelo Alexandre em
-- 01/11/2026 (pergunta 25.5, emenda MD-4); modelos Claude confirmados no mesmo dia (MD-3).
insert into public.configuracoes (chave, valor, descricao) values
  ('modelo_imagem', '"xai/grok-imagine-image-2.0"', 'Endpoint ID do modelo de edição de imagem (ficha e quadros) — Grok Imagine 2.0 (MD-4); alternativa: alibaba/qwen-image-3/edit'),
  ('modelo_video', '"bytedance/seedance-2.5/image-to-video"', 'Endpoint ID do image-to-video (clipes) — Seedance 2.5 (MD-4); alternativa: kling-video/v3.0/pro/image-to-video'),
  ('resolucao_video', '"1080p"', 'Resolução dos clipes'),
  ('preco_usd_por_segundo_video', '1.1372', 'Custo USD por segundo de clipe (Seedance 2.5 1080p sem áudio, sem desconto; MD-4)'),
  ('preco_usd_por_imagem', '0.09', 'Custo USD por imagem (Grok Imagine 2.0 em 2k; MD-4)'),
  ('cotacao_usd_brl', '5.50', 'Cotação USD→BRL do painel de custos'),
  ('cotacoes_para_brl', '{"usd": 5.50, "eur": 6.00}', 'Cotações para converter receita de pagamentos em BRL'),
  ('modelo_claude_roteiro', '"claude-sonnet-5"', 'Modelo Claude do roteiro e da refação'),
  ('modelo_claude_qc', '"claude-sonnet-5"', 'Modelo Claude do controle de qualidade das imagens (Anexo C.4)'),
  ('modelo_claude_qc_texto', '"claude-haiku-4-5"', 'Modelo Claude da revisão de texto da tela (Anexo C.6)'),
  ('contato_suporte', '"alexandre@dablab.com.br"', 'WhatsApp/e-mail do admin exibido em "Conta pausada" e suporte')
on conflict (chave) do nothing;

-- Marca piloto (seção 7.6), sem saldo.
insert into public.marcas (nome, instagram)
select 'Marca Teste Dab Lab', 'dablab_teste'
where not exists (select 1 from public.marcas where instagram = 'dablab_teste');
