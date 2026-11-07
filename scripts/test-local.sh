#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.cargo/bin:$HOME/.local/bin:$PATH"
export FERAL_USE_MODEL="${FERAL_USE_MODEL:-1}" FERAL_REQUIRE_MODEL="${FERAL_REQUIRE_MODEL:-1}"
export OPENSSL_DIR=/usr OPENSSL_LIB_DIR=/usr/lib/x86_64-linux-gnu OPENSSL_INCLUDE_DIR=/usr/include
python3 scripts/caption_card.py
cargo fmt --all --check
cargo test -p feral-controller --lib
cargo near build non-reproducible-wasm --no-abi --manifest-path controller/Cargo.toml --features fault-injection --out-dir target/fault
cargo near build non-reproducible-wasm --no-abi --manifest-path controller/Cargo.toml
cargo near build non-reproducible-wasm --no-abi --manifest-path mock-signer/Cargo.toml
cargo test -p feral-integration --tests -- --nocapture
node --test agents/brain.test.mjs
# Start agents/model_server.py before selecting the live route.
# Without these explicit flags, this runner is labelled deterministic replay.
cargo run -p feral-integration --example terrarium
(cd app && npm ci && npm run sync && npm run build && npm test && npm audit)
(cd evm && npm ci && forge test -vv)
