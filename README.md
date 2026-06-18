# zk-bench

Benchmark suite for a 53k-constraint Poseidon circuits across three proving stacks:

- [gnark](gnark) in Go
- [arkworks](arkworks) in Rust
- [snarkjs](snarkjs) with Circom and Node.js

The root scripts [setup.sh](setup.sh) and [bench.sh](bench.sh) are the main entrypoints. `setup.sh` prepares dependencies and SnarkJS artifacts for all stacks, and `bench.sh` runs the benchmarks in sequence.

## Layout

- [gnark/main.go](gnark/main.go) compiles the circuit, runs Groth16, and prints constraint and prover timing metrics.
- [arkworks/src/main.rs](arkworks/src/main.rs) does the same for the arkworks stack.
- [snarkjs/setup.sh](snarkjs/setup.sh) prepares the Circom circuit, ptau, zkey, and verification key.
- [snarkjs/bench.sh](snarkjs/bench.sh) generates a witness and measures proving time.

## Running

1. Install the required toolchains: Go, Rust, Node.js, Circom, and SnarkJS.
2. Run `./setup.sh` from the repository root.
3. Run `./bench.sh` from the repository root.

## Notes

- Generated SnarkJS artifacts live under [snarkjs/build](snarkjs/build) and are ignored by git.
- The Go and Rust benchmarks are intentionally small drivers rather than full applications.
- Hash counts are intentionally different across stacks to keep constraint counts comparable: gnark uses 286 hashes, arkworks uses 291 hashes, and snarkjs uses 250 hashes.