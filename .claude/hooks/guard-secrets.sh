#!/bin/bash
# Bloqueia credencial privilegiada em código que roda (ou pode rodar) no cliente.
# Implementa a seção 20: segredos só em apps/web/src/server/ e apps/worker/.
# Rotas em src/app/api não leem segredo direto: importam de src/server/.
command -v jq >/dev/null || { echo "Guardrail inativo: jq não está instalado. Instale o jq (brew install jq) antes de continuar." >&2; exit 2; }
input=$(cat)
path=$(echo "$input" | jq -r '.tool_input.file_path // empty')
content=$(echo "$input" | jq -r '.tool_input.content // .tool_input.new_string // empty')

# Variável pública com nome de segredo é proibida em qualquer arquivo.
if echo "$content" | grep -qE 'NEXT_PUBLIC_[A-Z_]*(SERVICE_ROLE|SECRET|ANTHROPIC|HF_API|HF_WEBHOOK|STRIPE_SECRET|STRIPE_WEBHOOK)'; then
  echo "Bloqueado: segredo exposto como variável NEXT_PUBLIC_ (seção 20). Segredos nunca vão para o navegador." >&2
  exit 2
fi

case "$path" in
  */apps/web/src/app/*|*/apps/web/src/components/*|*/apps/web/src/features/*) ;;
  *) exit 0 ;;
esac

if echo "$content" | grep -qE 'service_role|SUPABASE_SERVICE_ROLE_KEY|ANTHROPIC_API_KEY|HF_API_KEY_SECRET|HF_API_KEY_ID|HF_WEBHOOK_TOKEN|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|sk_live_|sk_test_|whsec_'; then
  echo "Bloqueado: credencial privilegiada fora de src/server (seção 20). Crie/use uma função em apps/web/src/server/ e chame-a da rota ou da action." >&2
  exit 2
fi
exit 0
