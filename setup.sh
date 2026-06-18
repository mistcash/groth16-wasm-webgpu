#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "== gnark dependencies =="
(cd "$ROOT_DIR/gnark" && go mod download)

echo "== arkworks dependencies =="
(cd "$ROOT_DIR/arkworks" && cargo fetch && cargo build -r)

echo "== snarkjs setup =="
(cd "$ROOT_DIR/snarkjs" && ./setup.sh)