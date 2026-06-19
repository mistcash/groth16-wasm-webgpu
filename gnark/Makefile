WNARK_CRYPTO := ../../wnark-crypto
GOROOT_WASM   := $(shell go env GOROOT)/lib/wasm/wasm_exec.js

.PHONY: wasm assets serve-web serve-webgpu

# Build the circuit-specific witness maker WASM (shared by both runtimes)
wasm:
	GOOS=js GOARCH=wasm go build -o web/witness.wasm ./cmd/witnessmaker
	cp web/witness.wasm webgpu/witness.wasm

# Copy/build all assets into web/ (native) and webgpu/ (WebGPU)
assets: wasm
	# wasm_exec.js
	cp "$(GOROOT_WASM)" web/wasm_exec.js
	cp "$(GOROOT_WASM)" webgpu/wasm_exec.js
	# prover WASMs from wnark-crypto pre-built dist
	cp $(WNARK_CRYPTO)/web/dist/assets/groth16-native.wasm  web/groth16-native.wasm
	cp $(WNARK_CRYPTO)/web/dist/assets/groth16-webgpu.wasm webgpu/groth16-webgpu.wasm
	# WebGPU JS library (imported by wnark-bridge.js as /wnark-dist/index.js)
	rm -rf webgpu/wnark-dist && cp -r $(WNARK_CRYPTO)/web/dist webgpu/wnark-dist
	# NTT domain data (fetched at runtime by the WebGPU curve module)
	mkdir -p webgpu/testdata/vectors/fr
	cp $(WNARK_CRYPTO)/testdata/vectors/fr/bn254_ntt_domains.json    webgpu/vectors/
	cp $(WNARK_CRYPTO)/testdata/vectors/fr/bls12_381_ntt_domains.json webgpu/vectors/
	cp $(WNARK_CRYPTO)/testdata/vectors/fr/bls12_377_ntt_domains.json webgpu/vectors/
	# Key files into webgpu/ (source of truth stays in web/)
	mkdir -p webgpu/prover
	cp web/prover/cs       webgpu/prover/cs
	cp web/prover/pk.dump  webgpu/prover/pk.dump
	cp web/assignment.json webgpu/assignment.json

# Serve native prover on :8080
serve-web:
	cd web && python3 -m http.server 8080

# Serve WebGPU prover on :8081
serve-webgpu:
	cd webgpu && python3 -m http.server 8081
