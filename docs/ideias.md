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

## M-1 — Mais cenários para os anúncios (01/11/2026, Alexandre) — melhoria registrada
Novas opções de "Onde" no Novo anúncio, sempre com **nomes genéricos** (nunca o nome real do lugar) e **sem logos nem marcas** visíveis nas imagens:

| Valor sugerido | Nome na tela (pt / en) | Inspiração (não aparece no app) | Notas para o prompt |
|---|---|---|---|
| `orla_calcadao` | Orla com calçadão e ciclovia / Beachfront boardwalk | orla de praia com calçadão e ciclovia | areia e mar ao fundo, ciclovia, luz natural |
| `barras_na_praia` | Barras ao ar livre na praia / Beach workout bars | aparelhos de ginástica ao ar livre numa praia | barras e paralelas de metal na areia |
| `parque_urbano` | Parque urbano / City park | parque grande tipo Ibirapuera | gramado, árvores, pista de caminhada, prédios ao longe |
| `beira_rio` | Calçadão à beira-rio / Riverside walk | calçadão à beira de rio tipo Chicago | rio, guarda-corpo, prédios altos, sem placas legíveis |
| `academia_ampla` | Academia ampla e clara / Big bright gym | academia grande tipo Bodytech | muita luz clara, equipamentos modernos, **sem logo nem marca** |

**O que muda quando for implementar:**
- migration acrescentando os valores ao enum `cenario` (7.2);
- rótulos em `opcoes.cenarios` (pt/en);
- imagens dos cartões em `public/images/cenarios/` (geradas na Higgsfield, como na 16.3);
- o roteiro recebe a descrição do cenário;
- a cláusula de imagem já proíbe logos e textos inventados; para estes cenários, reforçar "no signage, no brand names".
