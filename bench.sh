#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "== gnark =="
(cd "$ROOT_DIR/gnark" && go run . | grep "[BENCH]")

echo "== arkworks =="
(cd "$ROOT_DIR/arkworks" && ./target/release/zk-bench-arkworks | grep "[BENCH]")

echo "== snarkjs =="
(cd "$ROOT_DIR/snarkjs" && ./bench.sh | grep "[BENCH]")