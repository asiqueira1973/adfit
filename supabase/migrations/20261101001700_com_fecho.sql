-- Emenda MD-15 (01/11/2026, pedido do Alexandre): o fecho (cartela com logo, CTA e oferta) é opcional
-- por anúncio. Sem fecho, o vídeo sai só com as cenas — o lojista põe os próprios textos no Reels.
alter table public.anuncios add column if not exists com_fecho boolean not null default true;
