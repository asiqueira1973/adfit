-- Advisors (MD-17): a função de trigger do limite de fotos de personagem não deve ser chamável
-- pela API (/rest/v1/rpc); só o trigger a usa. Mesmo tratamento de limitar_fotos_produto.
revoke execute on function public.limitar_fotos_personagem() from public, anon, authenticated;
