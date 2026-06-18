#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if command -v snarkjs >/dev/null 2>&1; then
  SNARKJS_BIN="snarkjs"
elif command -v npx >/dev/null 2>&1; then
  SNARKJS_BIN="npx --yes snarkjs@0.7.6"
else
  echo "snarkjs not found. Install dependencies with: npm install" >&2
  exit 1
fi

if [[ ! -f build/poseidon250_final.zkey || ! -f build/poseidon250_js/generate_witness.js ]]; then
  echo "Missing setup artifacts. Run ./setup.sh first." >&2
  exit 1
fi

node build/poseidon250_js/generate_witness.js build/poseidon250_js/poseidon250.wasm input.json build/witness.wtns

START_MS=$(node -e 'console.log(Date.now())')
if ! $SNARKJS_BIN groth16 prove build/poseidon250_final.zkey build/witness.wtns build/proof.json build/public.json >/dev/null; then
  snarkjs r1cs info build/poseidon250.r1cs | sed -nE 's/.*# of Constraints: ([0-9]+).*/snarkjs_constraints=\1/p'
  echo "snarkjs_prover_ms=unsupported"
  echo "snarkjs_note=groth16_prove_failed_on_bn254"
  exit 0
fi
END_MS=$(node -e 'console.log(Date.now())')

$SNARKJS_BIN r1cs info build/poseidon250.r1cs | sed -nE 's/.*# of Constraints: ([0-9]+).*/snarkjs_constraints=\1/p'
echo "snarkjs_prover_ms=$((END_MS-START_MS))"