#!/usr/bin/env bash
# Start local Qwen on loopback, then the keeper on the Space port.
set -euo pipefail
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-7860}"
export FERAL_ALLOW_ORIGIN="${FERAL_ALLOW_ORIGIN:-https://davisbrains.github.io}"
export FERAL_TRUST_PROXY="${FERAL_TRUST_PROXY:-1}"
export FERAL_LOCAL_MODEL="${FERAL_LOCAL_MODEL:-1}"
export FERAL_MODEL_URL="${FERAL_MODEL_URL:-http://127.0.0.1:11436}"
export FERAL_MODEL_PORT="${FERAL_MODEL_PORT:-11436}"
export FERAL_THREADS="${FERAL_THREADS:-4}"
export FERAL_MODEL_LOCAL_ONLY="${FERAL_MODEL_LOCAL_ONLY:-1}"
# Ephemeral only. Chain state lives on NEAR testnet.
export FERAL_DATA="${FERAL_DATA:-/tmp/feral-data}"
export FERAL_STATIC="${FERAL_STATIC:-/app/static}"
mkdir -p "$FERAL_DATA"

echo "feral space: starting local Qwen on 127.0.0.1:${FERAL_MODEL_PORT}"
python3 /app/arena_model.py &
MODEL_PID=$!

echo "feral space: waiting for model health"
ok=0
for _ in $(seq 1 180); do
  if curl -sf "http://127.0.0.1:${FERAL_MODEL_PORT}/health" >/dev/null; then ok=1; break; fi
  if ! kill -0 "$MODEL_PID" 2>/dev/null; then echo "model process exited"; exit 1; fi
  sleep 2
done
if [ "$ok" != 1 ]; then echo "model did not become ready"; exit 1; fi
echo "feral space: model ready"

cd /app/keeper
node server.mjs &
KEEPER_PID=$!

term() { kill "$MODEL_PID" "$KEEPER_PID" 2>/dev/null || true; }
trap term EXIT INT TERM
while kill -0 "$MODEL_PID" 2>/dev/null && kill -0 "$KEEPER_PID" 2>/dev/null; do sleep 2; done
echo "feral space: a process exited"
exit 1
