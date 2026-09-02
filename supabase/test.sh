#!/usr/bin/env bash
# Levanta un Postgres local, aplica la migración y corre los tests de acceso.
#
# No hace falta tener el proyecto de Supabase creado: esto prueba el esquema y
# las políticas RLS, que es donde están los riesgos reales.
#
#   ./supabase/test.sh
set -euo pipefail

PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PGDATA=${PGDATA:-/var/lib/postgresql/salgo}
PORT=${PORT:-5433}
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export PATH="$PGBIN:$PATH"

# El chequeo va como usuario postgres: el directorio de datos es suyo y root
# no puede ni leerlo, así que preguntando como root siempre diría "apagado"
# y borraríamos una base que está corriendo.
if ! su postgres -c "PATH=$PGBIN:\$PATH pg_ctl -D $PGDATA status" >/dev/null 2>&1; then
  echo "▶ levantando Postgres en el puerto $PORT…"
  rm -rf "$PGDATA"; mkdir -p "$PGDATA"
  chown postgres:postgres "$PGDATA" 2>/dev/null || true
  chmod 700 "$PGDATA"
  su postgres -c "PATH=$PGBIN:\$PATH initdb -D $PGDATA -U postgres --auth=trust" >/dev/null
  su postgres -c "PATH=$PGBIN:\$PATH pg_ctl -D $PGDATA -l $PGDATA/log -o '-p $PORT -k /tmp' -w start" >/dev/null
fi

PSQL="psql -h /tmp -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"

echo "▶ recreando la base…"
$PSQL -c "drop database if exists salgo;" -c "create database salgo;"

echo "▶ imitando las piezas de Supabase (auth.users, auth.uid)…"
$PSQL -d salgo -f "$HERE/tests/00_local_stub.sql" 2>&1 | grep -v "wal_level\|HINT" || true

echo "▶ aplicando migraciones…"
for f in "$HERE"/migrations/*.sql; do
  echo "   $(basename "$f")"
  $PSQL -d salgo -f "$f"
done

echo "▶ corriendo tests de acceso…"
psql -h /tmp -p $PORT -U postgres -d salgo -v ON_ERROR_STOP=1 \
  -f "$HERE/tests/01_rls_test.sql" 2>&1 \
  | grep -E "^===|NOTICE|ERROR|TODOS LOS" \
  | sed 's/.*NOTICE:  //; s/psql:[^ ]* //'
