-- =============================================================================
-- AdFit — pedidos de convite (emenda MD-9, docs/mudancas-de-escopo.md).
-- Quem não tem acesso pede um convite na tela Entrar; o admin vê e decide. Continua sem
-- autocadastro (seção 28): o pedido não cria conta nem marca.
-- O formulário público grava pelo servidor (service_role); o cliente não escreve nem lê.
-- Teste: supabase/tests/08_pedidos_convite.test.sql.
-- =============================================================================

create type public.pedido_convite_status as enum ('novo', 'convidado', 'recusado');

-- pedidos_convite — quem quer acesso ao AdFit (MD-9).
create table public.pedidos_convite (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 80),
  email text not null check (char_length(email) between 3 and 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  marca text not null check (char_length(marca) between 1 and 80),
  instagram text check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  mensagem text check (char_length(mensagem) <= 500),
  idioma public.idioma not null default 'pt_br',
  status public.pedido_convite_status not null default 'novo',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
-- pedidos_convite_email_novo_uidx — um pedido em aberto por e-mail (evita repetição e spam).
create unique index pedidos_convite_email_novo_uidx on public.pedidos_convite (lower(email)) where status = 'novo';
create index pedidos_convite_status_criado_em_idx on public.pedidos_convite (status, criado_em desc);

-- trg_pedidos_convite_atualizado_em — mantém atualizado_em.
create trigger trg_pedidos_convite_atualizado_em before update on public.pedidos_convite
  for each row execute function public.definir_atualizado_em();

alter table public.pedidos_convite enable row level security;

-- pedidos_convite_select_admin / pedidos_convite_update_admin — só o admin lê e muda o status.
create policy pedidos_convite_select_admin on public.pedidos_convite for select to authenticated
  using ((select public.eh_admin()));
create policy pedidos_convite_update_admin on public.pedidos_convite for update to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));

revoke insert, update, delete on public.pedidos_convite from authenticated, anon;
grant update (status) on public.pedidos_convite to authenticated;
