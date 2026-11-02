# Plano — I-2: catálogo de personagens da marca (emenda MD-17)

Decisões do Alexandre (01/11/2026): pessoa real permitida, **sem** pedir autorização de imagem
(responsabilidade do lojista); ficha de personagem custa **2 créditos** (refazer 1), como a ficha da
peça; aba nova **Personagens**; botão **"Salvar esta modelo como personagem"** no anúncio.

> Convenções e verificação: `00-plano-geral.md`. Bilíngue (MD-1). Teste antes do código em cada bug.

## Banco (uma migration + pgTAP)
- `personagens`: marca, nome (≤ 60), descricao do lojista (≤ 300), `modelo_en` (descrição em inglês
  usada nos prompts, ≤ 600), genero_modelo, faixa_etaria, origem (`descricao` | `fotos` | `anuncio`),
  `ficha_aprovada_id`, `anuncio_origem_id`, arquivado, criado_por, datas.
- `fotos_personagem`: até 4 fotos de referência (trigger de limite, como `fotos_produto`); caminho
  `produtos/<marca>/personagens/<personagem>/originais/<arquivo>` com CHECK.
- `fichas_personagem`: versões da ficha (mesmo `status_ficha`), `imagem_path`, `geracao_id`,
  `instrucao_refacao`; índice único de uma `gerando` por personagem; `aprovar_ficha_personagem()`.
- Enums: `tipo_geracao` + `ficha_personagem`; `acao_cobravel` + `gerar_ficha_personagem` (2) e
  `refazer_ficha_personagem` (1) em `precos_acoes`; `referencia_tipo` aceita `personagem`.
- `anuncios.personagem_id` (opcional; FK composta com a marca).
- RLS: marca lê/cria/edita/arquiva só os próprios; fichas só leitura (escrita pelo servidor);
  Storage: política de escrita do cliente em `<marca>/personagens/<personagem>/originais/*` só para
  personagem da marca. Config `modelo_personagem` (padrão Flare).

## Servidor
1. **Criar personagem** (`POST /api/personagens`): nome, descrição, gênero, faixa, fotos opcionais
   (enviadas direto ao Storage, como as do produto; HEIC convertido).
2. **Ficha de personagem** (`POST /api/personagens/:id/ficha`, aprovar, refazer com atalhos):
   - verifica o saldo da Higgsfield antes de cobrar e debita antes de submeter;
   - o Claude escreve o `modelo_en` a partir da descrição e das fotos (visão);
   - prompt `personagem.v1.md`: folha de referência 16:9 com corpo inteiro de frente, 3/4, rosto
     em close e costas, roupa esportiva lisa sem marca e fundo cinza; com fotos, a mesma pessoa
     das fotos;
   - reusa o pipeline de geração (webhook, Storage, falha → retentativa → estorno).
3. **Anúncio com personagem:**
   - `createAd` aceita `personagem_id` (da marca, com ficha aprovada);
   - o roteiro (`roteiro.v5`) recebe a modelo fixa e não inventa outra; o código usa o `modelo_en`
     da personagem;
   - as cenas mandam 2 referências: ficha da peça e ficha da personagem ("Reference image 2 is the
     character sheet: same face, hair, body and skin tone").
4. **Salvar modelo do anúncio** (`POST /api/anuncios/:id/salvar-personagem`): cria personagem
   `origem = anuncio` com o `modelo` do roteiro e as imagens atuais das cenas como referência →
   ficha de personagem (2 créditos).

## Telas
- **Personagens** (menu): grade com a ficha, "Nova personagem" (nome, descrição, gênero, idade, até
  4 fotos opcionais) → tela da personagem com o painel da ficha (aprovar/refazer, como a ficha da
  peça) e "Anúncios com esta personagem".
- **Novo anúncio → Quem vai vestir**: "Personagem do catálogo" (cartões com a ficha) ou "Criar nova
  para este anúncio" (campos de hoje).
- **Anúncio**: botão "Salvar esta modelo como personagem · 2 créditos" (imagens prontas, sem
  personagem do catálogo).
- Jornada e "Como funciona" citam as personagens; analytics `adfit_personagem_*`.

## Testes
RLS das 3 tabelas (marca A × B) e Storage; limite de 4 fotos; débito/estorno da ficha de personagem;
prompt com 2 referências e `modelo_en` fixo; personagem de outra marca recusada; salvar do anúncio
cria a personagem com as referências; bilíngue; `npm run verify` + verificador independente.

## Fora desta versão
Personagem compartilhada entre marcas, várias personagens no mesmo anúncio, voz/fala.
