#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.cargo/bin:$HOME/.local/bin:$PATH"
export OPENSSL_DIR=/usr OPENSSL_LIB_DIR=/usr/lib/x86_64-linux-gnu OPENSSL_INCLUDE_DIR=/usr/include
python3 scripts/caption_card.py
cargo fmt --all --check
cargo test -p feral-controller --lib
cargo near build non-reproducible-wasm --no-abi --manifest-path controller/Cargo.toml
cargo test -p feral-integration --test playthrough -- --nocapture
(cd evm && npm ci && forge test -vv)
