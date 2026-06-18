#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if command -v circom >/dev/null 2>&1; then
  CIRCOM_BIN="circom"
elif command -v npx >/dev/null 2>&1 && npx --yes circom2 --help >/dev/null 2>&1; then
  CIRCOM_BIN="npx --yes circom2"
else
  echo "circom compiler not found. Install circom 2.x or add circom2 npm package." >&2
  exit 1
fi

if command -v snarkjs >/dev/null 2>&1; then
  SNARKJS_BIN="snarkjs"
elif command -v npx >/dev/null 2>&1; then
  SNARKJS_BIN="npx --yes snarkjs@0.7.6"
else
  echo "snarkjs not found. Install dependencies with: npm install" >&2
  exit 1
fi

rm -rf build
mkdir -p build

$CIRCOM_BIN poseidon250.circom --r1cs --wasm --sym -l node_modules -o build

$SNARKJS_BIN powersoftau new bn128 17 build/pot17_0000.ptau -v >/dev/null
$SNARKJS_BIN powersoftau contribute build/pot17_0000.ptau build/pot17_final.ptau --name="first" -v -e="bench" >/dev/null

if ! $SNARKJS_BIN groth16 setup build/poseidon250.r1cs build/pot17_final.ptau build/poseidon250_final.zkey >/dev/null; then
  snarkjs r1cs info build/poseidon250.r1cs | sed -nE 's/.*# of Constraints: ([0-9]+).*/snarkjs_constraints=\1/p'
  echo "snarkjs_prover_ms=unsupported"
  echo "snarkjs_note=groth16_setup_failed_on_bn254"
  exit 0
fi

if ! $SNARKJS_BIN zkey export verificationkey build/poseidon250_final.zkey build/verification_key.json >/dev/null; then
  snarkjs r1cs info build/poseidon250.r1cs | sed -nE 's/.*# of Constraints: ([0-9]+).*/snarkjs_constraints=\1/p'
  echo "snarkjs_prover_ms=unsupported"
  echo "snarkjs_note=groth16_export_failed_on_bn254"
  exit 0
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
