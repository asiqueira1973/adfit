-- =============================================================================
-- AdFit — feedback do usuário (emenda MD-6, docs/mudancas-de-escopo.md).
-- Usuário da marca (ou admin) envia "problema" ou "sugestão" com a tela de onde veio; só lê os
-- próprios; o admin lê todos e muda o status (novo → visto → resolvido).
-- Teste: supabase/tests/07_feedbacks.test.sql.
-- =============================================================================

create type public.feedback_tipo as enum ('problema', 'sugestao');
create type public.feedback_status as enum ('novo', 'visto', 'resolvido');

-- feedbacks — mensagens dos usuários para o admin (MD-6).
create table public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis (id),
  marca_id uuid references public.marcas (id),
  tipo public.feedback_tipo not null,
  texto text not null check (char_length(texto) between 1 and 2000),
  tela text check (char_length(tela) <= 300),
  status public.feedback_status not null default 'novo',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index feedbacks_usuario_id_idx on public.feedbacks (usuario_id);
create index feedbacks_marca_id_idx on public.feedbacks (marca_id);
create index feedbacks_status_criado_em_idx on public.feedbacks (status, criado_em desc);

-- trg_feedbacks_atualizado_em — mantém atualizado_em (mesma função das outras tabelas).
create trigger trg_feedbacks_atualizado_em before update on public.feedbacks
  for each row execute function public.definir_atualizado_em();

alter table public.feedbacks enable row level security;

-- feedbacks_select — cada um lê os próprios; o admin lê todos.
create policy feedbacks_select on public.feedbacks for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.eh_admin()));

-- feedbacks_insert — só em nome próprio, com a própria marca (nula para admin), status inicial.
create policy feedbacks_insert on public.feedbacks for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and marca_id is not distinct from (select public.minha_marca_id())
    and status = 'novo'
    and exists (select 1 from public.perfis p where p.id = (select auth.uid()) and p.ativo)
  );

-- feedbacks_update_admin — só o admin muda o status.
create policy feedbacks_update_admin on public.feedbacks for update to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));

-- Colunas: o cliente escreve só o conteúdo; o admin só o status (sem delete para ninguém).
revoke insert, update, delete on public.feedbacks from authenticated, anon;
grant insert (usuario_id, marca_id, tipo, texto, tela) on public.feedbacks to authenticated;
grant update (status) on public.feedbacks to authenticated;
