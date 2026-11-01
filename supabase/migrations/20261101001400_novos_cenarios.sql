-- Novos cenários (melhoria M-1 pedida pelo Alexandre, 01/11/2026): orla de praia com calçadão e ciclovia,
-- aparelhos de ginástica na praia, parque urbano grande, calçadão à beira-rio e academia ampla e clara.
-- Nomes genéricos (sem lugar real nem marca de academia). Só acrescenta valores ao enum `cenario`.
alter type public.cenario add value if not exists 'orla_praia';
alter type public.cenario add value if not exists 'academia_praia';
alter type public.cenario add value if not exists 'parque_urbano';
alter type public.cenario add value if not exists 'calcadao_rio';
alter type public.cenario add value if not exists 'academia_ampla';
