-- =============================================================================
-- AdFit — remove geracoes_status_criado_em_idx (criado na 20261101001000): idêntico ao
-- geracoes_status_idx da 20261101000200, que já atende a varredura de gerações paradas
-- (seção 4.3). Achado do advisor de performance (duplicate_index).
-- =============================================================================
drop index public.geracoes_status_criado_em_idx;
