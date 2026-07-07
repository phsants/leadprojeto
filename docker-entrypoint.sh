#!/bin/sh
set -e

echo "==> Aplicando schema no banco (prisma db push)..."
npx prisma db push --skip-generate --accept-data-loss

# Roda o seed (admin + regras de score) se RUN_SEED=true.
# Idempotente: usa upsert, não duplica dados.
if [ "$RUN_SEED" = "true" ]; then
  echo "==> Rodando seed (admin + scoring rules)..."
  npx prisma db seed || echo "Seed falhou ou já aplicado — seguindo."
fi

echo "==> Iniciando aplicação na porta ${PORT:-3000}..."
exec npx next start -p "${PORT:-3000}"
