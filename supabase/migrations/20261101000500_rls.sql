-- =============================================================================
-- AdFit — RLS e privilégios (seção 6.4; matriz da seção 5).
-- Duas camadas: (1) GRANTs por coluna limitam O QUE o cliente pode escrever;
-- (2) políticas limitam QUAIS LINHAS (só a própria marca, ou admin).
-- Toda escrita fora destas listas passa pelo servidor com service_role (seção 13).
-- `(select fn())` nas políticas evita reavaliar por linha (advisor auth_rls_initplan).
-- =============================================================================

-- Base: ninguém do lado do cliente escreve nada; anon não lê nada.
revoke all on public.marcas, public.perfis, public.produtos, public.fotos_produto, public.fichas_produto,
  public.anuncios, public.cenas, public.quadros, public.clipes, public.geracoes, public.movimentacoes_creditos,
  public.precos_acoes, public.pacotes_creditos, public.pagamentos, public.configuracoes
  from anon, authenticated;

grant select on public.marcas, public.perfis, public.produtos, public.fotos_produto, public.fichas_produto,
  public.anuncios, public.cenas, public.quadros, public.clipes, public.geracoes, public.movimentacoes_creditos,
  public.precos_acoes, public.pacotes_creditos, public.pagamentos, public.configuracoes
  to authenticated;

-- Escritas permitidas ao cliente (seção 6.4), coluna a coluna.
-- marcas: kit da marca (+ idioma_anuncios, MD-1). saldo_creditos e ativa nunca.
grant update (nome, instagram, logo_path, cor_destaque, cta_padrao, tom_de_voz, idioma_anuncios) on public.marcas to authenticated;
-- produtos: dados do produto; ficha_aprovada_id só pelo servidor (/api/fichas/:id/aprovar).
grant insert (marca_id, nome, categoria, genero_alvo, descricao) on public.produtos to authenticated;
grant update (nome, categoria, genero_alvo, descricao, arquivado) on public.produtos to authenticated;
-- fotos_produto: insert/delete enquanto não há ficha aprovada.
grant insert (produto_id, marca_id, storage_path, ordem) on public.fotos_produto to authenticated;
grant delete on public.fotos_produto to authenticated;
-- anuncios: só título e arquivado.
grant update (titulo, arquivado) on public.anuncios to authenticated;

alter table public.marcas enable row level security;
alter table public.perfis enable row level security;
alter table public.produtos enable row level security;
alter table public.fotos_produto enable row level security;
alter table public.fichas_produto enable row level security;
alter table public.anuncios enable row level security;
alter table public.cenas enable row level security;
alter table public.quadros enable row level security;
alter table public.clipes enable row level security;
alter table public.geracoes enable row level security;
alter table public.movimentacoes_creditos enable row level security;
alter table public.precos_acoes enable row level security;
alter table public.pacotes_creditos enable row level security;
alter table public.pagamentos enable row level security;
alter table public.configuracoes enable row level security;

-- marcas_select — lê a própria marca; admin lê todas.
create policy marcas_select on public.marcas for select to authenticated
  using (id = (select public.minha_marca_id()) or (select public.eh_admin()));
-- marcas_update_kit — edita o kit da própria marca (colunas pelo grant acima); admin qualquer.
create policy marcas_update_kit on public.marcas for update to authenticated
  using (id = (select public.minha_marca_id()) or (select public.eh_admin()))
  with check (id = (select public.minha_marca_id()) or (select public.eh_admin()));

-- perfis_select — o próprio perfil e os da mesma marca; admin todos. Escrita só servidor.
create policy perfis_select on public.perfis for select to authenticated
  using (id = (select auth.uid()) or marca_id = (select public.minha_marca_id()) or (select public.eh_admin()));

-- produtos_select / produtos_insert / produtos_update — própria marca; admin todas.
create policy produtos_select on public.produtos for select to authenticated
  using (marca_id = (select public.minha_marca_id()) or (select public.eh_admin()));
create policy produtos_insert on public.produtos for insert to authenticated
  with check (marca_id = (select public.minha_marca_id()) or (select public.eh_admin()));
create policy produtos_update on public.produtos for update to authenticated
  using (marca_id = (select public.minha_marca_id()) or (select public.eh_admin()))
  with check (marca_id = (select public.minha_marca_id()) or (select public.eh_admin()));

-- fotos_select / fotos_insert / fotos_delete — própria marca; insert/delete só enquanto o
-- produto não tem ficha aprovada, e a foto precisa ser da mesma marca do produto.
create policy fotos_select on public.fotos_produto for select to authenticated
  using (marca_id = (select public.minha_marca_id()) or (select public.eh_admin()));
create policy fotos_insert on public.fotos_produto for insert to authenticated
  with check (
    (marca_id = (select public.minha_marca_id()) or (select public.eh_admin()))
    and exists (
      select 1 from public.produtos p
      where p.id = produto_id and p.marca_id = fotos_produto.marca_id and p.ficha_aprovada_id is null
    )
  );
create policy fotos_delete on public.fotos_produto for delete to authenticated
  using (
    (marca_id = (select public.minha_marca_id()) or (select public.eh_admin()))
    and exists (select 1 from public.produtos p where p.id = produto_id and p.ficha_aprovada_id is null)
  );

-- fichas_select — própria marca; admin. Escrita só servidor.
create policy fichas_select on public.fichas_produto for select to authenticated
  using (marca_id = (select public.minha_marca_id()) or (select public.eh_admin()));

-- anuncios_select / anuncios_update_basico — própria marca; update só título e arquivado.
create policy anuncios_select on public.anuncios for select to authenticated
  using (marca_id = (select public.minha_marca_id()) or (select public.eh_admin()));
create policy anuncios_update_basico on public.anuncios for update to authenticated
  using (marca_id = (select public.minha_marca_id()) or (select public.eh_admin()))
  with check (marca_id = (select public.minha_marca_id()) or (select public.eh_admin()));

-- cenas_select / quadros_select / clipes_select — própria marca; admin. Escrita só servidor.
create policy cenas_select on public.cenas for select to authenticated
  using (marca_id = (select public.minha_marca_id()) or (select public.eh_admin()));
create policy quadros_select on public.quadros for select to authenticated
  using (marca_id = (select public.minha_marca_id()) or (select public.eh_admin()));
create policy clipes_select on public.clipes for select to authenticated
  using (marca_id = (select public.minha_marca_id()) or (select public.eh_admin()));

-- geracoes_select_admin — só admin (prompts, modelo e custo USD nunca chegam à marca, seção 5).
create policy geracoes_select_admin on public.geracoes for select to authenticated
  using ((select public.eh_admin()));

-- movimentacoes_select — própria marca; admin todas.
create policy movimentacoes_select on public.movimentacoes_creditos for select to authenticated
  using (marca_id = (select public.minha_marca_id()) or (select public.eh_admin()));

-- precos_select — todos os autenticados (o custo aparece em todo botão, princípio 4).
create policy precos_select on public.precos_acoes for select to authenticated
  using (true);

-- pacotes_select — usuário da marca vê só pacotes ativos; admin vê todos.
create policy pacotes_select on public.pacotes_creditos for select to authenticated
  using (ativo or (select public.eh_admin()));

-- pagamentos_select — própria marca; admin todos. Escrita só servidor/webhook.
create policy pagamentos_select on public.pagamentos for select to authenticated
  using (marca_id = (select public.minha_marca_id()) or (select public.eh_admin()));

-- configuracoes_select_admin — só admin (modelos e preços USD).
create policy configuracoes_select_admin on public.configuracoes for select to authenticated
  using ((select public.eh_admin()));
