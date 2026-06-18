#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"
SNARKJS_BIN="npx --yes snarkjs@0.7.6"

if [[ ! -f build/circuit_final.zkey || ! -f build/circuit_js/generate_witness.js ]]; then
  echo "Missing setup artifacts. Run ./setup.sh first." >&2
  exit 1
fi

# echo "Using snarkjs $($SNARKJS_BIN --version | head -n1)"

node build/circuit_js/generate_witness.js build/circuit_js/circuit.wasm input.json build/witness.wtns

START_MS=$(node -e 'console.log(Date.now())')

# $SNARKJS_BIN groth16 prove -h
$SNARKJS_BIN groth16 prove build/circuit_final.zkey build/witness.wtns build/proof.json build/public.json

END_MS=$(node -e 'console.log(Date.now())')

$SNARKJS_BIN r1cs info build/circuit.r1cs | sed -nE 's/.*# of Constraints: ([0-9]+).*/snarkjs_constraints=\1/p'
echo "snarkjs_prover_ms=$((END_MS-START_MS))"