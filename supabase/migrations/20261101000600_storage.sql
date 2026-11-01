-- =============================================================================
-- AdFit — Storage (seção 6.4): buckets privados `marcas`, `produtos`, `anuncios`.
-- Todo objeto começa com `<marca_id>/`. Leitura: própria marca ou admin (por URL assinada
-- de 60 min). Escrita do cliente só em `marcas/<marca_id>/logo/*` e
-- `produtos/<marca_id>/<produto_id>/originais/*`; o resto é gravado pelo servidor.
-- Limites: logo até 5 MB (critério 8.3); fotos até 10 MB (critério 8.3).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('marcas', 'marcas', false, 5242880, array['image/png', 'image/svg+xml', 'image/jpeg']),
  ('produtos', 'produtos', false, 10485760, array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']),
  ('anuncios', 'anuncios', false, null, null);

-- storage_adfit_select — lê objetos da própria marca (1º segmento = minha_marca_id()); admin todos.
create policy storage_adfit_select on storage.objects for select to authenticated
  using (
    bucket_id in ('marcas', 'produtos', 'anuncios')
    and ((storage.foldername(name))[1] = (select public.minha_marca_id())::text or (select public.eh_admin()))
  );

-- storage_adfit_insert — cliente só grava o logo da marca e as fotos originais do produto.
create policy storage_adfit_insert on storage.objects for insert to authenticated
  with check (
    ((storage.foldername(name))[1] = (select public.minha_marca_id())::text or (select public.eh_admin()))
    and (
      (bucket_id = 'marcas' and (storage.foldername(name))[2] = 'logo')
      or (bucket_id = 'produtos' and (storage.foldername(name))[3] = 'originais')
    )
  );

-- storage_adfit_update — trocar o logo / reenviar original (upsert), nos mesmos caminhos.
create policy storage_adfit_update on storage.objects for update to authenticated
  using (
    ((storage.foldername(name))[1] = (select public.minha_marca_id())::text or (select public.eh_admin()))
    and (
      (bucket_id = 'marcas' and (storage.foldername(name))[2] = 'logo')
      or (bucket_id = 'produtos' and (storage.foldername(name))[3] = 'originais')
    )
  );

-- storage_adfit_delete — apagar logo antigo ou foto original (enquanto sem ficha aprovada,
-- regra validada na linha de fotos_produto e na rota do épico 8.3).
create policy storage_adfit_delete on storage.objects for delete to authenticated
  using (
    ((storage.foldername(name))[1] = (select public.minha_marca_id())::text or (select public.eh_admin()))
    and (
      (bucket_id = 'marcas' and (storage.foldername(name))[2] = 'logo')
      or (bucket_id = 'produtos' and (storage.foldername(name))[3] = 'originais')
    )
  );
