-- Emenda MD-13 (01/11/2026, pedido do Alexandre): a chamada final (CTA) da marca passa a ser opcional;
-- sem CTA, o fecho do vídeo mostra só o logo (ou o nome) e a oferta. O limite de 40 caracteres continua.
alter table public.marcas alter column cta_padrao drop not null;
