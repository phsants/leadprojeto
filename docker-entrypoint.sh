#!/bin/sh
set -e

echo "==> Aplicando schema no banco (prisma db push)..."
npx prisma db push --skip-generate --accept-data-loss

# Preenche campos de rastreabilidade da matriz v1.0 nos registros antigos
# (classe por score, motivo de sobrescrita, versão, flag renomeada). Idempotente.
echo "==> Backfill matriz v1.0..."
npx tsx prisma/backfill-matrix-v1.ts || echo "Backfill falhou — seguindo (rode à mão: npx tsx prisma/backfill-matrix-v1.ts)."

# Roda o seed (admin + regras de score) se RUN_SEED=true.
# Idempotente: usa upsert, não duplica dados.
if [ "$RUN_SEED" = "true" ]; then
  echo "==> Rodando seed (admin + scoring rules)..."
  npx prisma db seed || echo "Seed falhou ou já aplicado — seguindo."
fi

echo "==> Iniciando aplicação na porta ${PORT:-3000}..."
exec npx next start -p "${PORT:-3000}"
