-- =============================================================================
-- AdFit — seed (seção 7.6). Idempotente (on conflict). Admin e pacotes entram por
-- scripts/seed-admin.ts, que lê SEED_ADMIN_* e SEED_STRIPE_PRICE_* das variáveis de ambiente.
-- =============================================================================

-- Preços por ação (regra 11.1).
insert into public.precos_acoes (acao, creditos, descricao) values
  ('gerar_ficha', 2, 'Gerar ficha do produto'),
  ('refazer_ficha', 1, 'Refazer ficha'),
  ('gerar_roteiro_quadros', 2, 'Criar anúncio'),
  ('refazer_quadro', 1, 'Refazer imagem da cena'),
  ('gerar_video', 12, 'Gerar vídeo'),
  ('refazer_clipe', 4, 'Refazer cena em vídeo'),
  ('remontar_texto', 0, 'Atualizar vídeo')
on conflict (acao) do nothing;

-- Configurações (regra 11.6). Endpoints da Higgsfield ficam "a_confirmar" até a pergunta 25.5;
-- o ID do modelo Claude e o contato de suporte estão pendentes de confirmação do Alexandre.
insert into public.configuracoes (chave, valor, descricao) values
  ('modelo_imagem', '"a_confirmar"', 'Endpoint ID do modelo de edição de imagem (ficha e quadros) — pergunta 25.5'),
  ('modelo_video', '"a_confirmar"', 'Endpoint ID do Kling 3.0 image-to-video (clipes) — pergunta 25.5'),
  ('resolucao_video', '"1080p"', 'Resolução dos clipes'),
  ('preco_usd_por_segundo_video', '0.112', 'Custo USD por segundo de clipe (Kling 3.0 1080p sem áudio; confirmar no console)'),
  ('preco_usd_por_imagem', '0.08', 'Custo USD por imagem (confirmar no console)'),
  ('cotacao_usd_brl', '5.50', 'Cotação USD→BRL do painel de custos'),
  ('cotacoes_para_brl', '{"usd": 5.50, "eur": 6.00}', 'Cotações para converter receita de pagamentos em BRL'),
  ('modelo_claude_roteiro', '"claude-sonnet-5-5"', 'Modelo Claude do roteiro e da refação'),
  ('modelo_claude_qc', '"claude-sonnet-5-5"', 'Modelo Claude do controle de qualidade'),
  ('contato_suporte', '"alexandre@dablab.com.br"', 'WhatsApp/e-mail do admin exibido em "Conta pausada" e suporte')
on conflict (chave) do nothing;

-- Marca piloto (seção 7.6), sem saldo.
insert into public.marcas (nome, instagram)
select 'Kore Active', 'kore_active'
where not exists (select 1 from public.marcas where instagram = 'kore_active');
