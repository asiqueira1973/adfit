# Ideias para depois do piloto (backlog — NÃO implementar no MVP)

Ideias do Alexandre registradas durante a implementação. Nenhuma faz parte do spec v0.2; viram
item de spec só depois de revisadas (seção 28 continua valendo).

## I-1 — Catálogo pelo Google Drive + plano de comunicação semanal (01/11/2026) — plano pronto e estacionado para a próxima release (`plans/I-1-catalogo-drive-plano.md`)
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

## I-2 — Catálogo de personagens da marca (01/11/2026, Alexandre)
- **Ideia:** a marca guarda personagens (modelos) com uma **ficha de personagem** — imagem de referência com rosto, corpo e penteado em ângulos fixos, como a ficha da peça. No Novo anúncio, escolhe "usar um personagem do catálogo" ou "deixar o AdFit criar um novo"; o novo pode ser salvo no catálogo depois.
- **Por quê:** a mesma "embaixadora" em vários anúncios cria identidade de marca e série de conteúdo; resolve de vez a consistência da modelo (O-1), porque a imagem de referência vale mais que a descrição em texto.
- **Como encaixa no que existe:** a ficha de personagem seria uma 2ª imagem de referência nas cenas (o Flare aceita até 16), ao lado da ficha da peça; o roteiro deixa de inventar a `modelo` e usa a do catálogo.
- **Para pensar:**
  - criar o personagem a partir de uma descrição (gerado) ou de fotos de uma pessoa real — pessoa real exige autorização de uso de imagem por escrito;
  - preço da ficha de personagem em créditos;
  - limite de personagens por marca;
  - os filtros de conteúdo com pessoa de referência;
  - personagem só da marca que criou.
- **Relação:** combina com a I-1 (plano semanal com a mesma personagem).

## M-1 (feito em 01/11/2026: orla_praia, academia_praia, parque_urbano, calcadao_rio, academia_ampla) — Mais cenários para os anúncios (01/11/2026, Alexandre) — melhoria registrada
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

## O-1 — Observação: consistência da modelo entre as cenas (01/11/2026)
- **Visto uma vez:** anúncio do top azul-marinho na orla — cabelo cacheado solto nas cenas 1 e 2, preso na cena 3. Na ocasião a cena 3 saiu do Grok e as outras do Flare (antes do MD-12), o que pode explicar a diferença sozinho.
- **Se repetir** (com as 3 cenas no mesmo modelo): mudança genérica — o roteiro fixa penteado e acessórios na descrição da `modelo`, e o código acrescenta em toda cena "same person, same hairstyle and same accessories in every scene" (nova versão do roteiro + cláusula).
- **Até lá:** só observar nos próximos anúncios.
