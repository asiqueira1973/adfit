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
