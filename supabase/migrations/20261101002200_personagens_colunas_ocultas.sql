-- Verificador (MD-17): `personagens.modelo_en` é o texto em inglês que entra nos prompts (na
-- personagem salva de um anúncio é cópia de `anuncios.roteiro.modelo`, oculto pela D-10). O cliente
-- lê só as colunas da interface; o servidor lê tudo com service_role.
revoke select on public.personagens from authenticated;
grant select (
  id, marca_id, nome, descricao, genero_modelo, faixa_etaria, origem, anuncio_origem_id,
  ficha_aprovada_id, arquivado, criado_por, criado_em, atualizado_em
) on public.personagens to authenticated;
