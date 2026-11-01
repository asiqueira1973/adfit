# Ideias para depois do piloto (backlog — NÃO implementar no MVP)

Ideias do Alexandre registradas durante a implementação. Nenhuma faz parte do spec v0.2; viram
item de spec só depois de revisadas (seção 28 continua valendo).

## I-1 — Catálogo pelo Google Drive + plano de comunicação semanal (01/11/2026)
- **Ideia:** a marca compartilha uma pasta do Google Drive com as fotos do catálogo inteiro; a
  plataforma importa os produtos e sugere um **plano de comunicação semanal** (quais peças, em que
  cenários/modalidades, em que dias), já pronto para virar anúncios.
- **Perguntas para pensar:** autorização (OAuth do Google ou link público?), como agrupar fotos
  em produtos automaticamente, custo de gerar fichas em lote (créditos), o que o plano usa como
  sinal (estação, lançamentos, estoque, desempenho de anúncios anteriores), e se o plano gera os
  anúncios sozinho ou só sugere.
- **Base que já existe:** produtos/fichas (8.3/8.4), opções de anúncio da 11.4, Claude para o
  roteiro (8.5) — o plano seria um prompt novo sobre o catálogo.
- **Posicionamento (Alexandre, 01/11/2026):** o diferencial frente ao Ads/Marketing Studio da
  própria Higgsfield (risco "Concorrência" da seção 23) pode estar na **praticidade e no
  planejamento** — um serviço contínuo (o que postar, quando e com qual peça), não só a geração
  de um vídeo avulso. A I-1 é o primeiro passo nessa direção.
