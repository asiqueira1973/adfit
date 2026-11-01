#!/bin/bash
# Prompt versionado é imutável: mudança vira arquivo vN+1 (seção 18 — "Prompts são código").
# Garante que anuncios.prompt_versao sempre aponte para o texto exato usado.
command -v jq >/dev/null || { echo "Guardrail inativo: jq não está instalado. Instale o jq (brew install jq) antes de continuar." >&2; exit 2; }
input=$(cat)
path=$(echo "$input" | jq -r '.tool_input.file_path // empty')
case "$path" in
  */apps/web/src/server/prompts/*.md) ;;
  *) exit 0 ;;
esac
rel="${path#"$CLAUDE_PROJECT_DIR"/}"
if git -C "$CLAUDE_PROJECT_DIR" ls-files --error-unmatch "$rel" >/dev/null 2>&1; then
  echo "Bloqueado: $rel já está versionado. Crie a próxima versão (ex.: roteiro.v2.md) e atualize PROMPT_VERSIONS (seção 18)." >&2
  exit 2
fi
exit 0
