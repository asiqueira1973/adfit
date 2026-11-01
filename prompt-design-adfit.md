# Prompt para o Claude Design — AdFit (nome provisório)

Usado pelo Claude Code para gerar as telas (ou colado no Claude Design). Cobre todas as telas da seção 10 do spec.md v0.2.

```
Crie o design completo de um web app mobile-first chamado "AdFit" (nome provisório): uma plataforma em que lojas de roupa fitness sobem fotos de uma peça e recebem um anúncio em vídeo de 15 s para Instagram, gerado por IA. O usuário principal é o dono de uma loja pequena, operando pelo celular, sem nenhum conhecimento de IA. Ele nunca vê termos técnicos (prompt, modelo, parâmetros).

## Direção visual (seguir à risca)
- Interface clara e calma, simplicidade estilo Apple: listas agrupadas, tipografia forte, muito espaço. A energia fitness vem das FOTOS, não da interface.
- Tokens: fundo #FFFFFF (escuro #0B0B0C); superfície #F5F5F7 (escuro #1C1C1E); texto #1D1D1F (escuro #F5F5F7); texto secundário #6E6E73 (escuro #A1A1A6).
- Cor da marca: verde-limão #C6F432 nos botões primários, com texto escuro. Nunca usar como cor de status.
- Cores semânticas, só para significado: sucesso #34C759, alerta #FF9F0A, erro #FF3B30, processando #0A84FF.
- Tipografia Inter: títulos 28/22/17 (Display), corpo 15–17 (Text). Números de saldo em algarismos tabulares.
- Raio 14 px em cartões, 10 px em botões. Hairlines de 1 px em vez de bordas grossas.
- Modo claro e escuro.
- Alvos de toque ≥ 44 px, contraste AA.
- Imagens de exemplo: fotos editoriais de atletas e roupas de treino SEM logos reais (placeholders fotográficos). Nenhuma marca de terceiros.
- Ícones lineares estilo Lucide.

## Navegação
- Usuário da marca: barra inferior no celular com 4 abas (Início, Produtos, Anúncios, Créditos); no desktop, barra superior com as mesmas abas. "Marca" e "Sair" ficam no menu do perfil (avatar no topo). O saldo de créditos aparece no topo de todas as telas da marca.
- Administrador: menu lateral estilo App Store Connect:
  - grupos com título em negrito escuro, caixa normal: "Clientes" (Marcas, Usuários), "Operação" (Gerações, Custos), "Sistema" (Configurações);
  - itens indentados sob o grupo, sem marcador/bolinha;
  - hairline fina entre os grupos;
  - um item ativo por vez, texto em #5B8C00 com pílula clara do mesmo verde ao fundo;
  - rodapé com usuário, sair e selo discreto de ambiente (dev/prod);
  - cantos suaves, espaçamento generoso.

## Regra de custo (aparece em todo botão cobrado)
Todo botão que consome créditos mostra o custo no próprio rótulo, ex.: "Gerar ficha · 2 créditos", "Criar anúncio · 2 créditos", "Refazer imagem · 1 crédito", "Gerar vídeo · 12 créditos", "Refazer cena · 4 créditos". Ações grátis dizem "grátis" ("Atualizar vídeo · grátis"). Sem saldo, o botão fica desabilitado com o texto "Saldo insuficiente" e um link "Comprar créditos".

## Fluxo principal (desenhar as telas nesta sequência)
Novo produto → fotos → Gerar ficha → aprovar ficha → Novo anúncio (4 passos + resumo) → tela do Anúncio com 3 cenas (imagens) → escolher/refazer imagens → Gerar vídeo → progresso → vídeo pronto no player → ajustar texto / refazer cena / baixar.

## Telas — Público
1. Entrar: e-mail, senha, "Esqueci minha senha". Foto editorial de fundo (atleta mulher em academia escura, luz lateral, top e legging pretos lisos, levantamento terra) — metade esquerda no desktop, topo no celular.
2. Definir / Redefinir senha: nova senha + confirmação (mínimo 8 caracteres), botão Salvar.

## Telas — Marca (usuario_marca)
3. Início: saldo em destaque; botão primário "Novo anúncio"; grade com os últimos 6 anúncios (miniatura, título, selo de status); lista "Produtos sem ficha"; lembrete "Adicione seu logo para ele aparecer no fim dos vídeos." quando a marca não tem logo.
   - Estado vazio: "Comece pelo produto: suba uma foto da peça e a gente prepara a ficha."
4. Produtos: grade de produtos (foto ou ficha, nome, selo "Sem ficha" / "Pronto para anúncio"), filtro por categoria, botão "Novo produto", ação arquivar.
   - Estado vazio com foto de peça preta dobrada sobre banco de madeira: "Nenhum produto ainda. Pode ser foto de celular, no cabide ou em cima da mesa."
5. Novo produto: nome, categoria (top, legging, shorts, camiseta, regata, jaqueta, conjunto, outro), gênero (feminino, masculino, unissex), descrição opcional, upload de 1 a 4 fotos com barra de progresso. Aviso: "Se a foto tiver alguém, usamos só a peça."
   - Estado de erro de upload: "Esse arquivo não deu. Use foto JPG, PNG ou HEIC de até 10 MB."
6. Produto: fotos originais; área da ficha (uma imagem com 3 painéis: frente, costas e detalhe do logo, fundo cinza claro); miniaturas das versões da ficha ("Versão 1", "Versão 2"); botões "Gerar ficha · 2 créditos" / "Aprovar ficha" / "Refazer · 1 crédito" com campo "O que está diferente da peça real?"; lista de anúncios deste produto; botão "Novo anúncio com este produto".
   - Estado gerando: "Preparando a ficha da peça. Leva uns 2 minutos — pode sair que a gente guarda."
   - Estado pronto: "Confira se a peça está igual à real: cor, recortes e logo."
   - Estado falhou: "Algo deu errado do nosso lado. Os créditos voltaram para o seu saldo."
7. Novo anúncio — assistente em 4 passos + resumo, um assunto por tela, opções como cartões grandes com miniatura:
   - Passo 1: escolher produto (só os com ficha aprovada).
   - Passo 2: Onde (academia, box de crossfit, estúdio funcional, ao ar livre urbano, ao ar livre natureza, pista de corrida) e Esporte (musculação, crossfit, hyrox, corrida, funcional, yoga/pilates) — miniaturas fotográficas.
   - Passo 3: Modelo (mulher / homem), faixa etária (20–30, 30–45, 45+), observação opcional ("ex.: cabelo cacheado").
   - Passo 4: Estilo (energético, cinematográfico, lifestyle), Formato (Vertical 9:16 — Reels/Stories; Horizontal 16:9), Texto na tela (sim/não), Oferta opcional (até 40 caracteres).
   - Resumo: todas as escolhas editáveis e botão "Criar anúncio · 2 créditos".
   - Padrões já marcados: academia, musculação, modelo conforme o produto, 20–30, energético, vertical, com texto.
8. Anúncio — tela única que muda conforme o estado:
   - Gerando: "Montando as 3 cenas do seu anúncio…" com progresso por cena.
   - Aguardando aprovação: "Escolha a imagem de cada cena. Gostou das três? Gere o vídeo." Três cartões de cena (Cena 1 Gancho, Cena 2 Peça em ação, Cena 3 Final): imagem grande na proporção do formato, descrição curta em português, campo de texto da tela editável (2 linhas × 32 caracteres, contador), miniaturas de versões "Versão 1, Versão 2…" com botão "Usar esta", botão "Refazer imagem · 1 crédito" que abre o campo "O que você quer mudar nessa cena? (opcional)". Cartão com aviso em laranja quando aplicável: "Pode não estar fiel à peça — sugerimos refazer." Rodapé fixo com "Gerar vídeo · 12 créditos".
   - Gerando vídeo: "Animando as cenas. Leva uns 5 minutos — avisamos aqui quando ficar pronto." Progresso por cena e etapa final "Montando o vídeo".
   - Falha de cena: "Não conseguimos animar a cena {n}. Os créditos dela voltaram para você." com "Tentar de novo · 4 créditos".
   - Pronto: "Seu anúncio está pronto." Player do vídeo (9:16 ou 16:9) com controles nativos; botões "Baixar vídeo", "Editar textos" → "Atualizar vídeo · grátis", "Refazer cena · 4 créditos" por cena, troca para versão anterior de cada cena; renomear e arquivar no menu.
   - Durante qualquer geração, as ações que mudam o anúncio ficam desabilitadas.
9. Anúncios (biblioteca): grade com miniatura, título, data, selo de status; filtros por produto e status.
   - Estado vazio com foto de homem correndo em rua urbana ao amanhecer.
10. Créditos: saldo grande com botão primário "Comprar créditos"; extrato (data, descrição da ação, item com link, quantidade +/−, saldo após; compras mostram valor e moeda, ex.: "US$ 30,00"); tabela "Quanto custa cada ação"; histórico de pagamentos (data, pacote, valor, status: pago, falhou, expirado, reembolsado).
10a. Comprar créditos: título "Escolha um pacote"; cartões de pacote (créditos em destaque, preço na moeda do pacote, linha "Rende cerca de {n} anúncios"); botão "Pagar" que leva à página segura da Stripe (mostrar o estado "Abrindo o pagamento seguro…" e um selo discreto "Pagamento processado pela Stripe"). Retorno de cancelamento: aviso "Compra cancelada. Nada foi cobrado."
10b. Compra concluída: estado "Confirmando seu pagamento…" (spinner) e depois "Pronto! {n} créditos adicionados." com o novo saldo e botões "Criar anúncio" e "Voltar ao início". Estado de falha: "O pagamento não foi aprovado. Tente outro cartão."
11. Marca: logo (upload), nome, @ do Instagram, cor de destaque (seletor), CTA padrão (até 40 caracteres), tom de voz (frase livre); prévia ao vivo do fecho do vídeo (logo centralizado + CTA na cor de destaque sobre imagem escurecida) em 9:16.

Mensagens globais: "Conta pausada. Fale com o suporte: {contato}" (banner quando a marca está pausada; botões cobrados desabilitados) e "Seu acesso foi desativado. Fale com o suporte." (tela após logout forçado). Aviso inline ao digitar texto proibido: "Evite prometer resultado (ex.: emagrecer X kg). Isso pode derrubar seu anúncio no Instagram."

## Telas — Administrador (admin_plataforma), desktop-first com o menu lateral descrito
12. Marcas: tabela com nome, saldo, anúncios no mês, status (ativa/pausada); botão "Nova marca".
13. Marca (admin): abas Kit, Usuários, Extrato, Pagamentos, Anúncios; ações Editar, Pausar/Reativar, "Lançar créditos" (modal com tipo compra/bônus/ajuste, quantidade, valor pago em R$ obrigatório na compra, observação obrigatória em bônus/ajuste; erro "O ajuste deixaria o saldo negativo."), "Convidar usuário".
14. Usuários: tabela (nome, e-mail, marca, status); "Convidar" (e-mail, nome, marca); desativar/reativar.
15. Custos: filtros por marca e mês; indicadores — créditos consumidos, custo USD, custo R$, receita R$, margem R$ e %; % de anúncios que chegaram a pronto; créditos médios por anúncio; botão "Exportar CSV".
16. Gerações: tabela filtrável por tipo (ficha, imagem de cena, clipe), status (na fila, processando, concluída, falhou, bloqueada) e marca; detalhe lateral com entrada, erro, link do resultado, custo; botão "Reconsultar".
17. Configurações: tabela editável de preços por ação em créditos; tabela de pacotes de créditos (nome, créditos, preço, moeda, ID do preço na Stripe, ativo, ordem) com "Novo pacote" e desativar; campos de modelos (texto), preço USD por segundo de vídeo e por imagem, cotações para BRL, contato de suporte.

## Permissões refletidas na UI
- usuario_marca nunca vê custo em USD, margem, prompts, nome de modelo nem a área admin.
- Admin vê tudo e pode operar qualquer marca; ações cobradas pelo admin consomem crédito da marca e mostram isso no botão.

Entregue todas as telas no celular (390 px) e as do admin também em desktop (1280 px), com os estados descritos.
```
