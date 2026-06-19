// gen-pk-dump converts web/prover/pk (WriteTo format) to web/prover/pk.dump
// (WriteDump format) so the browser can load it without subgroup checks.
package main

import (
	"log"
	"os"

	groth16_bn254 "github.com/consensys/gnark/backend/groth16/bn254"
)

func main() {
	src := "web/prover/pk"
	dst := "web/prover/pk.dump"

	in, err := os.Open(src)
	if err != nil {
		log.Fatalf("open %s: %v", src, err)
	}
	defer in.Close()

	pk := new(groth16_bn254.ProvingKey)
	if _, err := pk.UnsafeReadFrom(in); err != nil {
		log.Fatalf("read pk: %v", err)
	}

	out, err := os.Create(dst)
	if err != nil {
		log.Fatalf("create %s: %v", dst, err)
	}
	defer out.Close()

	if err := pk.WriteDump(out); err != nil {
		log.Fatalf("write dump: %v", err)
	}

	log.Printf("wrote %s", dst)
}
