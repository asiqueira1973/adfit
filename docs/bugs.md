# Bugs encontrados nos testes do Alexandre

Histórico de bugs achados usando o app (produção ou local), com causa e correção. O teste que
reproduz fica no código sempre que dá para automatizar.

| # | Data | Onde | O que aconteceu | Causa | Correção | Status |
|---|---|---|---|---|---|---|
| B-1 | 01/11/2026 | Login com Google | Na volta do Google, caiu no `localhost:3000` (outro app) | Endereço de volta com `?next=/` não batia com a lista do Supabase; caiu no Site URL do projeto compartilhado | Volta sem query; depois, botão do Google na própria página (MD-7) | corrigido |
| B-2 | 01/11/2026 | Menu do perfil | Depois de clicar em Marca/Feedback, o menu ficava aberto por cima da página | `<details>` no cabeçalho não remonta na navegação | `MenuLink` fecha o menu ao navegar | corrigido |
| B-3 | 01/11/2026 | Ficha (produção) | "Algo deu errado" ao gerar a ficha da bermuda | Foto com nome `.jpg` e tipo `image/jpeg`, mas conteúdo HEIF; o modelo recusou | `toJpeg()` converte pelo conteúdo antes de mandar à IA (teste `images.test.ts`) | corrigido |
| B-4 | 01/11/2026 | Novo anúncio | Imagem do produto quebrada no cartão de escolha | Otimizador de imagens do Next não aceita a URL assinada do Storage | `unoptimized` para URLs externas no `OptionCard` | corrigido |
| B-5 | 01/11/2026 | Anúncio | Caixa "texto na tela" vazia em anúncio criado sem texto, parecendo obrigatória | Tela mostrava o campo mesmo com `com_texto = false` | Campo some e aparece "Sem texto na tela" | corrigido |
| B-6 | 01/11/2026 | Menu do perfil | Ao trocar o idioma, o menu não fechava (só fechava com refresh) | Mesmo `<details>` do B-2; clicar fora também não fechava | Troca de idioma fecha o menu; clique fora e Esc fecham qualquer menu (`MenuDismiss`) | corrigido |
| B-7 | 01/11/2026 | Menu do perfil | Avatar mostrava "A(" | Iniciais pegavam o 1º caractere de cada palavra, inclusive "(" de "(lojista teste)" | Só palavras que começam com letra | corrigido |
| B-8 | 01/11/2026 | Vídeo (produção) | Montagem falhou: (1) `spawn /ROOT/…/ffmpeg ENOENT`; (2) `Filter not found` | (1) O `ffmpeg-static` monta o caminho do binário pelo `__dirname`, que o empacotamento trocou por `/ROOT`; (2) o build Linux do ffmpeg não tem `drawtext` | (1) `serverExternalPackages` e busca nos caminhos reais; (2) textos desenhados em PNG com a Inter Bold (opentype.js + sharp) e sobrepostos com `overlay` (teste garante que não há `drawtext`); clipes reaproveitados, sem novo custo | corrigido |

## B-9 — Cenas barradas por conteúdo com top (01/11/2026)
Anúncio do top azul-marinho: o Grok barrou as 3 cenas e as 3 novas tentativas (`bloqueada_nsfw`), créditos estornados. Reproduzido direto na Higgsfield: prompts limpos e variações (modelo mais jovem, academia, sem cláusula) seguiram barrados; a mesma cena com a ficha **sem o 3º painel** (close da gola por dentro) passou. Qwen como alternativa passou mas copiou o layout da ficha (descartado). Correção: a nova tentativa pós-nsfw de quadro manda a ficha recortada (frente e costas; `dropCloseUpPanel`, flag `sem_close` na entrada). Teste: `server/higgsfield/nsfw-retry.test.ts`.

## B-10 — Refação da ficha usava o template antigo (01/11/2026)
A refação parte do prompt base da última versão; a v1 do top tinha sido gerada com `ficha.v2`, então a regra nova (só marca visível por fora) não entrou, e o pedido "não usar logo dentro, somente fora" virou "leve o logo para fora": o "oxer P" da etiqueta interna foi para a frente. Correção: `redoBasePrompt` recomeça do template atual quando a base é de outra versão. Junto, `ficha.v4`: painéis sem rótulos de texto (apareceu FRONT/BACK/CLOSE-UP). Teste: `server/sheets/redo.test.ts`.

## B-11 — Resumo da refação longo derrubava a refação (01/11/2026)
`resumo_pt` acima de 80 caracteres → `claude_fora_do_schema`, ficha `falhou` (crédito estornado). Agora é encurtado. Teste: `server/sheets/redo.test.ts`.

## B-12 — Aviso "Preparando a ficha" fora da tela (01/11/2026)
Ao tocar em Refazer (embaixo), o aviso aparecia no topo do painel, fora da tela. Agora o painel rola para a tela ao começar e ao terminar.

## B-13 — Estalo no começo do som da cena (01/11/2026)
Vídeo da orla: pico de −4 dB aos 0,3 s da cena 1 (resto do ambiente ~−40 dB), gerado pelo Seedance. Montagem: entrada suave de 0,6 s no som de cada cena + compressor (threshold 0,05, ratio 12). No áudio real, o pico caiu para −18 dB. Teste: `server/video/ambient-audio.test.ts` ("estalo…").

## B-14 — Débito sem estorno quando a função cai antes de criar os clipes (01/11/2026, verificador)
`startVideo`/`redoClip` debitam antes de criar os clipes; se a função caísse no meio, o anúncio ficava em `gerando_clipes` com o crédito debitado. Correção: `sweepOrphanClips` (chamado por `refreshAd` com `gerando_clipes` parado há mais de 6 min e nenhum clipe gerando) cria o clipe `falhou` da cena e estorna a parte dela (gerar vídeo) ou estorna o refazer sem clipe. Teste: `clips.integration.test.ts` ("clipes órfãos").

## B-15 — Registro do clipe sempre com aspect_ratio 9:16 (01/11/2026)
A entrada gravada em `geracoes` para os clipes trazia `aspect_ratio: "9:16"` fixo, mesmo em anúncio 16:9. Só o registro estava errado (o Seedance segue a proporção da imagem de entrada; o vídeo saía certo). Correção: `createClip` lê o formato do anúncio. Registros antigos de anúncios 16:9 corrigidos no banco. Teste: `clips.integration.test.ts` ("registro do clipe").

## B-16 — Tela da personagem quebrava em produção (01/11/2026)
A página (componente do servidor) passava uma função (`approve`) para o painel da ficha (componente do navegador); o Next.js não serializa funções e a página dava "This page couldn't load". Os testes do servidor não renderizam a página. Correção: o painel recebe `approveBase` (texto). Junto: o cartão da personagem mostrava "Sem ficha" com a ficha aguardando aprovação; agora mostra "Confira". Teste novo de `getCharacterView`.
