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
