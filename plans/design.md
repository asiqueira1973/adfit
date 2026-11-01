# Plano aprovado — Fase de Design (antes de qualquer tela ligada a dados)
1. Gerar imagens 16.3 com o conector Higgsfield (3 fotos + 6 cenários + 6 modalidades = 15), sem logos de terceiros; salvar em `apps/web/public/images/`. Se alguma falhar → placeholder marcado e aviso.
2. Componentes base em `components/ui/` (Button com custo no rótulo/“Saldo insuficiente”, Card, ListGroup, Badge de status, Segmented, Field com contador, BottomTabBar, TopBar com saldo, AdminSidebar estilo App Store Connect 16.4).
3. Todas as telas do briefing (1–17, 10a, 10b) em rotas reais, alimentadas por fixtures em `src/features/*/fixtures.ts` (trocadas por dados no épico correspondente), com todos os estados pedidos (vazio, gerando, falha, aviso QC, pronto, pausada, desativado, cancelada…), via `?estado=`.
4. Capturar no navegador interno: marca em 390 px, admin em 390 e 1280 px, claro e escuro → mostrar para aprovação. **Paro aqui até você aprovar.**
5. Aprovado: salvar capturas em `docs/design/<tela>-<largura>-<tema>.png`, commit, usar na verificação visual de cada épico (22.1).

> Convenções transversais, paradas obrigatórias e verificação: ver `00-plano-geral.md`.
