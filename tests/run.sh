#!/usr/bin/env bash
# Corre las pruebas de la app en un navegador real.
#
#   npm install playwright     (una sola vez)
#   ./tests/run.sh
#
# Necesita la app servida en http://localhost:8000. Si no está, la levanta.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if ! curl -s -o /dev/null http://localhost:8000/index.html 2>/dev/null; then
  echo "▶ levantando el servidor en el puerto 8000…"
  python3 -m http.server 8000 >/dev/null 2>&1 &
  SERVER=$!
  trap 'kill $SERVER 2>/dev/null || true' EXIT
  sleep 2
fi

for f in tests/0*.mjs; do
  echo ""
  echo "════ $(basename "$f") ════"
  node "$f"
done
