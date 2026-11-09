#!/usr/bin/env bash
# Copy the keeper into this folder so the Docker build context is self-contained.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
rm -rf "$HERE/keeper"
mkdir -p "$HERE/keeper"
shopt -s nullglob
for f in "$REPO"/keeper/*.{mjs,json}; do
  base="$(basename "$f")"
  case "$base" in
    *.test.mjs) ;;
    *) cp "$f" "$HERE/keeper/" ;;
  esac
done
rm -f "$HERE/keeper/"*.test.mjs
test -f "$HERE/keeper/package.json"
test -f "$HERE/keeper/package-lock.json"
test -f "$HERE/arena_model.py"
test -f "$HERE/Dockerfile"
test -f "$HERE/model-lock.json"
echo "assembled keeper into $HERE/keeper"
ls -la "$HERE/keeper"
