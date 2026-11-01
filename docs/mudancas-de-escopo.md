# Mudanças de escopo em relação ao spec.md v0.2

Registro de decisões do responsável de produto tomadas durante a implementação. O `spec.md` continua sendo a fonte de verdade; cada item aqui vale como emenda até o spec ser revisado.

## MD-1 — App também em inglês (31/10/2026)
- **Decisão (Alexandre):** o app precisa existir também em inglês. Motivo: usuários da marca piloto não falam português (ex.: a esposa e a filha do dono da Kore Active).
- **Conflita com:** seção 17 ("Idioma: pt-BR apenas") e seção 15 (copy só em português).
- **Detalhes em aberto:** ver `plans/00-plano-geral.md`, seção "Idiomas (MD-1)".

### Decisões do MD-1 (31/10/2026, Alexandre)
1. **Momento:** já a partir do épico 8.1 — toda tela nasce em pt-BR e inglês.
2. **Idioma da interface:** por usuário. Novo enum `idioma` (`pt_br`, `en`) e nova coluna `perfis.idioma idioma not null default 'pt_br'`; no primeiro acesso (definir senha) o valor é ajustado pelo idioma do navegador; troca no menu do perfil.
3. **Idioma do texto dentro do vídeo** (texto da tela, CTA, oferta): por marca. Nova coluna `marcas.idioma_anuncios idioma not null default 'pt_br'`, editável no kit da marca (usuário da marca e admin; entra na lista de colunas de `marcas_update_kit`). O Claude escreve o texto da tela nesse idioma.

### Efeitos colaterais a tratar nos épicos
- 8.1: enum e colunas acima; política `marcas_update_kit` inclui `idioma_anuncios`.
- Todos os épicos de UI: textos só via dicionários pt-BR/en (`src/lib/i18n/`); a copy em inglês da seção 15 é tradução minha e fica listada para revisão do Alexandre.
- 8.5: o Anexo C pede `texto_tela` em português. O prompt `roteiro.v1.md` entra literal (regra de prompts versionados); o suporte a inglês vira `roteiro.v2.md` com `{idioma_texto}` e o mesmo vale para `qc-texto` e para a lista de termos proibidos (seção 20), que ganha equivalentes em inglês. `refacao` devolve `resumo` no idioma do usuário.
- 8.9: valores continuam formatados com `Intl.NumberFormat` no idioma do usuário.
- `CTA padrão` da marca: o default `'Compre pelo link da bio'` vale para `pt_br`; marca com `idioma_anuncios = 'en'` recebe sugestão "Shop via link in bio" na tela da marca (sem mudar o default do banco).

## MD-2 — Crédito "Feito pela Dab Lab" (31/10/2026)
- **Decisão (Alexandre):** o app mostra que foi feito pela Dab Lab.
- **Onde:** linha discreta no rodapé das telas públicas (entrar, senha), no fim do menu do perfil da marca e no rodapé do menu lateral do admin. Constante `MADE_BY` em `apps/web/src/lib/constants.ts`; texto `feitoPor` em `copy.ts` ("Made by Dab Lab" no dicionário em inglês do MD-1).
- **Onde não:** dentro dos vídeos. O fecho do vídeo é só da marca do cliente (princípio 3 e regra 11.8).

## Respostas às perguntas abertas (seção 25) — 01/11/2026, Alexandre
- **25.1 Pacotes:** USD como proposto na regra 11.2.9 — Pacote 50 = 50 créditos por US$ 30; Pacote 120 = 120 créditos por US$ 65. **Sem cortesia**: a Kore Active compra o primeiro pacote pela Stripe.
- **25.6 Conta Stripe:** Dab Lab (CNPJ), Brasil. Atenção ao risco da seção 23 (repasse mais lento e taxa maior para cartão internacional); a taxa entra no preço dos pacotes.
- **E-mails do Auth no projeto compartilhado "BANCO DE TESTE":** aplicar os modelos do AdFit (convite e recuperação, bilíngues, com `{{ .RedirectTo }}`) no projeto compartilhado, ciente de que os outros apps passam a usar esses modelos.

## MD-3 — Modelos Claude (01/11/2026, Alexandre)
- O spec cita `claude-sonnet-5-5` e `claude-haiku-5-5`, que não existem. Decidido: **`claude-sonnet-5`** (Claude Sonnet 5, US$ 2 / US$ 10 por milhão de tokens — o preço que o spec atribuía ao "Sonnet 5.5") para roteiro, refação e QC das imagens; **`claude-haiku-4-5`** para a revisão de texto da tela (Anexo C.6).
- Nova chave em `configuracoes`: `modelo_claude_qc_texto` (a regra 11.6 só tinha `modelo_claude_qc`; a seção 4.2 já previa um modelo mais barato para o QC de texto).

## MD-4 — Modelos da Higgsfield e novos preços (01/11/2026, Alexandre) — responde à 25.5 e revisa a 25.1
- **Imagem (ficha e quadros):** a família Nano Banana citada na seção 4.2 **não existe na Higgsfield API**. Decidido: **Grok Imagine 2.0** (`xai/grok-imagine-image-2.0`; até 10 imagens de referência, então cabem as 4 fotos do produto; 9:16; 2k), a US$ 0,09 por imagem. Alternativa em `configuracoes`: Qwen Image 3 Edit (`alibaba/qwen-image-3/edit`, de 1 a 3 referências, US$ 0,075).
- **Vídeo (clipes):** decidido **Seedance 2.5** (`bytedance/seedance-2.5/image-to-video`, 1080p, `generate_audio=false`, 5 s), pela qualidade. Isso inverte a premissa A-5 (Kling 3.0 como padrão). Alternativa em `configuracoes`: Kling 3.0 Pro (`kling-video/v3.0/pro/image-to-video`, `sound=off`).
- **Custo:** segundo a calculadora da Higgsfield na conta, sem desconto: US$ 1,1372 por segundo em 1080p. Isso dá ~US$ 5,69 por clipe e **~US$ 17,06 por vídeo** (3 clipes). O Kling custaria US$ 1,68 sem desconto.
- **Preços revisados** para manter **margem mínima de 30%**, já descontada uma taxa estimada de ~7% da Stripe. O valor do crédito continua US$ 0,60 / US$ 0,54. Os demais preços da 11.1 não mudam; todos já têm margem acima de 40%.

| Ação | Antes (11.1) | Agora |
|---|---|---|
| `gerar_video` | 12 | **51** (17 por cena) |
| `refazer_clipe` | 4 | **17** |
| estorno por cena que falhou (11.2.4) | `floor(12/3) = 4` | `floor(51/3) = 17` (sempre `floor(preço debitado / 3)`) |

| Pacote (11.2.9) | Antes | Agora |
|---|---|---|
| pequeno | 50 créditos por US$ 30 | **Pacote 60**: 60 créditos por US$ 36 (US$ 0,60/crédito) |
| grande | 120 créditos por US$ 65 | **Pacote 150**: 150 créditos por US$ 81 (US$ 0,54/crédito) |

- **Anúncio típico** (11.1) passa a custar 2 + 51 = **53 créditos** (US$ 28,60 a 31,80). Com as refações usuais, 2 + 2 + 51 + 17 = **72 créditos**. Margem do vídeo no pior caso (crédito a US$ 0,54): 1 − 17,06 / 27,54 ≈ **38% bruta, ~31% depois da Stripe**. A meta "margem bruta ≥ 55%" da seção 21 fica abaixo com o Seedance; o painel 8.8 mede o valor real.
- **"Rende cerca de {n} anúncios" (seção 15):** deixa de usar o "÷ 20" fixo. Passa a dividir pelo custo atual do anúncio típico sem refação (`gerar_roteiro_quadros` + `gerar_video` = 53): Pacote 60 rende cerca de 1 anúncio e Pacote 150, cerca de 2.
- **Webhook da Higgsfield:** a documentação atual assina cada entrega no padrão Standard Webhooks (`webhook-id`, `webhook-timestamp`, `webhook-signature`, segredo `whsec_` no console). O token na query da seção 4.3 continua obrigatório. A assinatura é conferida também quando `HF_WEBHOOK_SECRET` estiver configurado.
- **Entrada de imagens:** a API aceita URL pública HTTPS. As URLs assinadas do Supabase (60 min) servem. Reserva: `POST /files/generate-upload-url`.
- **Retenção:** a Higgsfield guarda os resultados por 7 dias (`expires_at`). Copiamos tudo para o Storage antes de marcar `pronto`, como o spec já manda.
- **Stripe:** os Prices de teste foram recriados como avulsos em USD (`price_1UWyAc…` = Pacote 60, `price_1UWyAe…` = Pacote 150) e os pacotes antigos foram desativados no banco local. Para produção, o Alexandre cria os dois Prices na conta live e roda o `seed:admin` remoto com `SEED_STRIPE_PRICE_PACOTE_60/150`.

## MD-5 — Login com Google (01/11/2026, Alexandre) — implementado
- **Decisão:** entrar com a conta Google, por ser mais fácil que e-mail e senha.
- **Proposta:**
  - O cadastro continua só por convite (princípio da seção 6). O botão "Entrar com Google" só funciona para e-mails já convidados; sem perfil, vale a mesma recusa de hoje.
  - E-mail e senha continuam como alternativa.
  - O provedor Google é ativado no projeto Supabase compartilhado, com o cliente OAuth criado pelo Alexandre no Google Cloud.
- **Conflita com:** a seção 6.1 (login por e-mail e senha) e a seção 28 (fora do escopo: nada; o autocadastro continua fora).
- **Implementação:**
  - Botão "Entrar com Google" acima do formulário de e-mail e senha.
  - OAuth com PKCE pelo Supabase; a volta cai em `/auth/confirm`, que troca o código pela sessão, e o `error` do OAuth leva a `/entrar?erro=sem_acesso`.
  - Cliente OAuth no Google Cloud (projeto AdFit). Provedor ligado no projeto Supabase remoto pelo Alexandre e no local via `supabase/.env` (fora do git).
- **Atenção (projeto compartilhado):** se o projeto remoto permitir cadastro (outros apps), uma conta Google sem convite pode ser criada em `auth.users`. Ela não tem perfil no AdFit, então o proxy encerra a sessão e mostra "sem acesso".

## MD-6 — Feedback do usuário (01/11/2026, Alexandre) — a detalhar
- **Decisão:** o usuário consegue mandar problemas e sugestões de melhoria de dentro do app.
- **Proposta:**
  - Item "Enviar feedback" no menu do perfil, com tipo (problema ou sugestão), texto e a tela atual anexada automaticamente.
  - Nova tabela `feedbacks` com RLS: o usuário da marca só cria e lê os próprios; o admin lê todos.
  - Tela [Admin] Feedbacks com status (novo, visto, resolvido).

## I-1 — Plano de mídia a partir de uma pasta (backlog, ver `docs/ideias.md`)
- Reforço do Alexandre: sugerir o plano **não consome crédito**; só o que for gerado de fato é cobrado.
