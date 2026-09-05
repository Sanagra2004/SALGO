#!/usr/bin/env bash
# Corre las pruebas de la app en un navegador real.
#
#   npm install playwright     (una sola vez)
#   ./tests/run.sh
#
# Necesita la app servida en http://localhost:8000. Si no está, la levanta.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Las pruebas corren la app en MODO LOCAL (sin servidor), para que el resultado
# no dependa de la red ni del estado del proyecto de Supabase. Para eso se
# vacían las claves de config.js durante la corrida y se restauran al salir,
# aunque una prueba falle o se corte. La conexión real con el servidor se
# verifica aparte (03-servidor.mjs prueba la resiliencia con el servidor caído).
CFG="src/js/config.js"
BACKUP="$(mktemp)"
cp "$CFG" "$BACKUP"
SERVER=""

cleanup() {
  cp "$BACKUP" "$CFG"; rm -f "$BACKUP"
  [ -n "$SERVER" ] && kill "$SERVER" 2>/dev/null || true
}
trap cleanup EXIT

sed -i "s|export const SUPABASE_URL = '.*';|export const SUPABASE_URL = '';|; \
        s|export const SUPABASE_ANON_KEY = '.*';|export const SUPABASE_ANON_KEY = '';|" "$CFG"

if ! curl -s -o /dev/null http://localhost:8000/index.html 2>/dev/null; then
  echo "▶ levantando el servidor en el puerto 8000…"
  python3 -m http.server 8000 >/dev/null 2>&1 &
  SERVER=$!
  sleep 2
fi

for f in tests/0*.mjs; do
  echo ""
  echo "════ $(basename "$f") ════"
  node "$f"
done
