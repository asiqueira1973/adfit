# Instruções de revisão

## Passes
- Bugs: lógica, estados da seção 12, idempotência do webhook, condições de corrida no débito de créditos.
- Segurança: matriz da seção 5 e políticas da 6.4; segredos só em src/server e worker; nada de prompt/modelo/custo USD para usuario_marca; dados pessoais fora de log (seção 20).
- Conformidade: bate com spec.md (épicos da 8, regras da 11), com plans/ e com a seção 18 — banco em português snake_case, rotinas comentadas com a regra que implementam, prompts versionados sem edição de versão existente.

## O que é Importante
O que quebra comportamento, cobra crédito errado, vaza dado entre marcas ou viola regra do spec. Estilo é detalhe.

## Limite de detalhes
No máximo cinco detalhes por revisão; resuma o resto como contagem.

## Não reportar
Arquivos gerados (tipos do Supabase, schema.sql) e o que lint/typecheck já garantem.
