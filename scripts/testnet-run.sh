#!/usr/bin/env bash
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/bin:$PATH"
exec node scripts/testnet-run.mjs "$@"
