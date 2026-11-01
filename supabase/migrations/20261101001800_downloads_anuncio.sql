-- =============================================================================
-- AdFit — downloads de anúncio (métrica da seção 21: "anúncios baixados por semana"; fonte: as
-- próprias tabelas). Uma linha por download, gravada pelo servidor (service role) em
-- GET /api/anuncios/:id/download. Só o admin lê. Teste: supabase/tests/09_downloads.test.sql.
-- =============================================================================

-- Permite a FK composta abaixo (o download é da mesma marca do anúncio).
alter table public.anuncios add constraint anuncios_id_marca_id_key unique (id, marca_id);

-- downloads_anuncio — registro de cada download do vídeo final.
create table public.downloads_anuncio (
  id uuid primary key default gen_random_uuid(),
  anuncio_id uuid not null,
  marca_id uuid not null references public.marcas (id),
  criado_em timestamptz not null default now(),
  foreign key (anuncio_id, marca_id) references public.anuncios (id, marca_id)
);
create index downloads_anuncio_anuncio_marca_idx on public.downloads_anuncio (anuncio_id, marca_id);
create index downloads_anuncio_marca_criado_em_idx on public.downloads_anuncio (marca_id, criado_em);

alter table public.downloads_anuncio enable row level security;

-- downloads_anuncio_select_admin — só o admin lê (painel de Custos). Ninguém grava pelo cliente.
create policy downloads_anuncio_select_admin on public.downloads_anuncio for select to authenticated
  using ((select public.eh_admin()));

revoke all on public.downloads_anuncio from anon, authenticated;
grant select on public.downloads_anuncio to authenticated;
