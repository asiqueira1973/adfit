# Plano — I-1: catálogo pelo Google Drive + plano semanal (emenda MD-17)

> **Status: ESTACIONADO para uma nova release (Alexandre, 01/11/2026).** Decisões de produto já
> tomadas (abaixo); não implementar até ser retomado.

Decisões do Alexandre (01/11/2026): **seletor do Google** (escopo `drive.file`, não sensível — sem
verificação demorada do Google); **subpasta = produto**; o plano **sugere** e o lojista aprova cada
item (cobra só quando cria o anúncio; o plano é grátis).

> Convenções transversais e verificação: ver `00-plano-geral.md`. Bilíngue (MD-1).

## Parte A — Importar o catálogo do Drive

**Fluxo:** Produtos → "Importar do Google Drive" → login Google pedindo só `drive.file` →
seletor do Google (pastas e imagens) → a pessoa escolhe a pasta do catálogo → tela **Conferir**:
uma linha por produto proposto (subpasta = produto com o nome da subpasta; foto solta na raiz =
um produto com o nome do arquivo), até 4 fotos cada, com miniatura, nome editável, categoria e
"para quem" (padrão da marca), caixa para desmarcar → "Importar N produtos" → barra de progresso.

1. **Teste rápido primeiro (risco):** confirmar com uma pasta real se escolher a pasta no seletor
   com `drive.file` dá acesso aos arquivos dentro. Se **não** der: o seletor abre já dentro da
   pasta, a pessoa marca as fotos (vários de uma vez) e o agrupamento usa a pasta-mãe de cada
   foto; o nome do produto vem da pasta quando legível, senão do arquivo (editável na conferência).
2. **Cliente:** Google Identity Services (token client, só `drive.file`) + Google Picker
   (`setSelectFolderEnabled`, filtro de imagens). O token fica só no navegador e vai ao servidor
   apenas na requisição de importação (nunca gravado).
3. **Agrupamento** em função pura testada (`groupDriveFiles`): pastas → produtos, limite de 4
   fotos (as 4 primeiras por nome), ignora não-imagem, até **30 produtos por importação**.
4. **Importação** (`POST /api/produtos/importar-drive`, um produto por chamada para caber no tempo
   da Vercel e mostrar progresso): baixa cada arquivo pela Drive API com o token do usuário,
   valida tamanho (≤ 10 MB), converte com `toJpeg`, grava em
   `produtos/<marca>/<produto>/originais/` e cria `produtos` + `fotos_produto`. **Sem crédito.**
   Marca pausada não importa. Evento `adfit_catalogo_importado`.
5. **Ficha em lote (opcional na conferência):** caixa "Preparar as fichas agora · 2 créditos cada"
   — chama a geração de ficha existente para cada produto importado (débito antes, como hoje).

## Parte B — Plano semanal

**Fluxo:** novo item de menu **Plano** → "Montar o plano da semana" (escolhe a semana e quantos
posts: 3, 5 ou 7) → o Claude devolve a semana → cada dia mostra peça, onde, esporte, formato,
estilo e a ideia do post em uma frase → botões "Criar este anúncio · {n} créditos" (abre o
Novo anúncio já preenchido, no resumo, para confirmar) e "Descartar". Produto sem ficha aprovada:
"Prepare a ficha primeiro".

1. **Banco** (migration nova + pgTAP de RLS por tabela):
   - `planos_semanais` (marca, semana_inicio, posts_por_semana, status, criado_por, prompt_versao);
     único por marca+semana (regerar substitui os itens não usados).
   - `itens_plano` (plano, marca, dia, produto, cenario, modalidade, estilo, formato, ideia ≤ 140,
     motivo, status `sugerido|criado|descartado`, anuncio_id).
   - RLS: marca lê/atualiza só os próprios (status/descartar); escrita do plano só pelo servidor.
2. **Claude** (`modelo_claude_roteiro`, prompt novo `plano.v1.md`, ferramenta com schema Zod):
   entra o catálogo (nome, categoria, para quem, tem ficha, nº de anúncios e data do último),
   tom da marca, idioma, semana (datas) e nº de posts; sai a lista de itens só com produtos e
   valores de enum válidos (o código descarta o que vier fora). Regras do prompt: variar peças e
   cenários, priorizar peça sem anúncio recente, respeitar datas comemorativas da semana, nada de
   promessa de resultado corporal (seção 20). 2 tentativas, como o roteiro.
3. **Grátis com limite:** 1 plano por semana + até 3 refações por dia por marca (contra abuso).
4. **Criar anúncio a partir do item:** reaproveita `POST /api/anuncios` (débito normal); o item
   guarda `anuncio_id` e vira `criado`. Evento `adfit_plano_item_criado`.
5. **Telas:** Plano (semana atual, navegação entre semanas, vazio com explicação simples), Início
   ganha o cartão "Seu plano desta semana".

## O que você precisa fazer no Google Cloud (mesmo projeto do login)
- Ativar **Google Picker API** e **Google Drive API**.
- Criar uma **chave de API** restrita ao site `adfit.com.br` (e `localhost` para teste) e às duas APIs.
- Na tela de consentimento, acrescentar o escopo `.../auth/drive.file`.

## Testes e verificação
`groupDriveFiles` (pastas, raiz, limite 4, não-imagem, limite 30); importação com Drive simulado
(token inválido, arquivo grande, HEIC, marca pausada, sem débito); schema do plano e descarte de
valores inválidos; RLS das tabelas novas (marca A × B); criar anúncio a partir do item (débito,
`anuncio_id`, status). `npm run verify`, verificador independente, docs (MD-17, D-xx).

## Fora deste plano
Sinais de desempenho dos anúncios no Instagram, estoque, agendamento/publicação automática
(seção 28) e geração automática sem aprovação.
