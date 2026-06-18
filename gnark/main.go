package main

import (
	"fmt"
	"log"
	"time"

	bn254 "github.com/consensys/gnark-crypto/ecc/bn254"
	bn254fr "github.com/consensys/gnark-crypto/ecc/bn254/fr"
	poseidonnative "github.com/consensys/gnark-crypto/ecc/bn254/fr/poseidon2"
	"github.com/consensys/gnark/backend/groth16"
	"github.com/consensys/gnark/frontend"
	"github.com/consensys/gnark/frontend/cs/r1cs"
	poseidoncircuit "github.com/consensys/gnark/std/permutation/poseidon2"
)

type Poseidon250Circuit struct {
	In  frontend.Variable `gnark:",public"`
	Out frontend.Variable
}

func (c *Poseidon250Circuit) Define(api frontend.API) error {
	state := c.In

	params := poseidonnative.GetDefaultParameters()
	h, err := poseidoncircuit.NewPoseidon2FromParameters(api, 2, params.NbFullRounds, params.NbPartialRounds)
	if err != nil {
		return err
	}

	for i := 0; i < 250; i++ {
		state = h.Compress(0, state)
	}

	api.AssertIsEqual(c.Out, state)
	return nil
}

func computeOutput(input uint64) bn254fr.Element {
	state := new(bn254fr.Element).SetUint64(input)
	zero := new(bn254fr.Element)

	params := poseidonnative.GetDefaultParameters()
	perm := poseidonnative.NewPermutation(2, params.NbFullRounds, params.NbPartialRounds)

	for i := 0; i < 250; i++ {
		zeroBytes := zero.Bytes()
		stateBytes := state.Bytes()
		digest, err := perm.Compress(zeroBytes[:], stateBytes[:])
		if err != nil {
			log.Fatalf("compute output: %v", err)
		}
		state.SetBytes(digest)
	}

	return *state
}

func main() {
	var circuit Poseidon250Circuit

	ccs, err := frontend.Compile(bn254.ID.ScalarField(), r1cs.NewBuilder, &circuit)
	if err != nil {
		log.Fatalf("compile circuit: %v", err)
	}

	pk, vk, err := groth16.Setup(ccs)
	if err != nil {
		log.Fatalf("setup groth16: %v", err)
	}

	witness := Poseidon250Circuit{
		In:  1,
		Out: computeOutput(1),
	}
	fullWitness, err := frontend.NewWitness(&witness, bn254.ID.ScalarField())
	if err != nil {
		log.Fatalf("create witness: %v", err)
	}

	start := time.Now()
	proof, err := groth16.Prove(ccs, pk, fullWitness)
	if err != nil {
		log.Fatalf("prove: %v", err)
	}
	proverMS := time.Since(start).Milliseconds()

	publicWitness, err := fullWitness.Public()
	if err != nil {
		log.Fatalf("public witness: %v", err)
	}

	fmt.Printf("gnark_prover_ms=%d\n", proverMS)

	if err := groth16.Verify(proof, vk, publicWitness); err != nil {
		log.Fatalf("verify: %v", err)
	}

	fmt.Printf("gnark_constraints=%d\n", ccs.GetNbConstraints())
}
