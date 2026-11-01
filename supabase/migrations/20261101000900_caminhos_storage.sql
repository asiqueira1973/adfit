-- =============================================================================
-- AdFit — isolamento por caminho de Storage (seção 6.4; achado do verifier do 8.3).
-- Antes: `fotos_produto.storage_path` e `marcas.logo_path` aceitavam qualquer texto, e o servidor
-- (service_role) assinava/baixava/apagava o que estivesse ali — um usuário apontava a própria linha
-- para arquivos de outra marca. Agora:
--   1. CHECKs amarram o caminho à marca e ao produto da própria linha (formato da seção 7.3);
--   2. as políticas de escrita do bucket `produtos` exigem que o 2º segmento seja um produto da
--      marca do 1º segmento e ainda sem ficha aprovada (originais congelados, seção 7.4).
-- Testes: supabase/tests/05_caminhos_storage.test.sql e
--         apps/web/src/server/products/storage-isolation.integration.test.ts.
-- =============================================================================

-- Foto original: produtos/<marca_id>/<produto_id>/originais/<arquivo> (seção 7.3).
alter table public.fotos_produto add constraint fotos_produto_caminho_chk
  check (storage_path ~ ('^produtos/' || marca_id::text || '/' || produto_id::text || '/originais/[^/]+$'));

-- Logo: <marca_id>/logo/<arquivo> dentro do bucket `marcas` (seção 6.4).
alter table public.marcas add constraint marcas_logo_caminho_chk
  check (logo_path is null or logo_path ~ ('^' || id::text || '/logo/[^/]+$'));

-- -----------------------------------------------------------------------------
-- pode_gravar_original(nome) — o objeto `<marca>/<produto>/originais/<arquivo>` do bucket
-- `produtos` pertence a um produto daquela marca, sem ficha aprovada, e a marca é a do usuário
-- (ou ele é admin). Usada nas políticas storage_adfit_insert/update/delete (seção 6.4 e 7.4).
-- Recebe: o nome do objeto. Devolve: true se o cliente pode gravar/apagar ali.
-- -----------------------------------------------------------------------------
create function public.pode_gravar_original(p_nome text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (storage.foldername(p_nome))[3] = 'originais'
     and ((storage.foldername(p_nome))[1] = public.minha_marca_id()::text or public.eh_admin())
     and exists (
       select 1 from public.produtos p
       where p.id::text = (storage.foldername(p_nome))[2]
         and p.marca_id::text = (storage.foldername(p_nome))[1]
         and p.ficha_aprovada_id is null
     );
$$;
revoke execute on function public.pode_gravar_original(text) from public, anon;
grant execute on function public.pode_gravar_original(text) to authenticated, service_role;

-- storage_adfit_insert — logo na pasta da própria marca; original só via pode_gravar_original.
drop policy storage_adfit_insert on storage.objects;
create policy storage_adfit_insert on storage.objects for insert to authenticated
  with check (
    (bucket_id = 'marcas' and (storage.foldername(name))[2] = 'logo'
      and ((storage.foldername(name))[1] = (select public.minha_marca_id())::text or (select public.eh_admin())))
    or (bucket_id = 'produtos' and public.pode_gravar_original(name))
  );

-- storage_adfit_update — mesmas regras do insert (upsert).
drop policy storage_adfit_update on storage.objects;
create policy storage_adfit_update on storage.objects for update to authenticated
  using (
    (bucket_id = 'marcas' and (storage.foldername(name))[2] = 'logo'
      and ((storage.foldername(name))[1] = (select public.minha_marca_id())::text or (select public.eh_admin())))
    or (bucket_id = 'produtos' and public.pode_gravar_original(name))
  );

-- storage_adfit_delete — apagar logo da própria marca; original só enquanto não há ficha aprovada.
drop policy storage_adfit_delete on storage.objects;
create policy storage_adfit_delete on storage.objects for delete to authenticated
  using (
    (bucket_id = 'marcas' and (storage.foldername(name))[2] = 'logo'
      and ((storage.foldername(name))[1] = (select public.minha_marca_id())::text or (select public.eh_admin())))
    or (bucket_id = 'produtos' and public.pode_gravar_original(name))
  );
