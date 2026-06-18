#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

CIRCOM_BIN="npx --yes circom2"
SNARKJS_BIN="npx --yes snarkjs@0.7.6"

echo "Using circom  $($CIRCOM_BIN --version)"
echo "Using snarkjs $($SNARKJS_BIN --version | head -n1)"

if [[ ! -d node_modules ]]; then
  npm ci
fi

mkdir -p build

$CIRCOM_BIN circuit.circom --r1cs --wasm --sym -l node_modules -o build --O2

FINAL_PTAU="pot16_final.ptau"
$SNARKJS_BIN powersoftau prepare phase2 "build/pot16_0000.ptau" "build/$FINAL_PTAU"

echo "groth16 setup"
$SNARKJS_BIN groth16 setup build/circuit.r1cs "build/$FINAL_PTAU" build/circuit_final.zkey

echo "zkey export"
$SNARKJS_BIN zkey export verificationkey build/circuit_final.zkey build/verification_key.json

$SNARKJS_BIN r1cs info build/circuit.r1cs | sed -nE 's/.*# of Constraints: ([0-9]+).*/snarkjs_constraints=\1/p'

echo "All done!"