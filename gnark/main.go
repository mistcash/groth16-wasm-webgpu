package main

import (
	_ "embed" // Required for //go:embed directives
	"fmt"
	"log"
	"time"

	bn254 "github.com/consensys/gnark-crypto/ecc/bn254"
	poseidonnative "github.com/consensys/gnark-crypto/ecc/bn254/fr/poseidon2"
	groth16_bn254 "github.com/consensys/gnark/backend/groth16/bn254"
	cs_bn254 "github.com/consensys/gnark/constraint/bn254"
	"github.com/consensys/gnark/frontend"
	"github.com/consensys/gnark/logger"
	poseidoncircuit "github.com/consensys/gnark/std/permutation/poseidon2"
	"github.com/mistcash/zk-bench/gnark/serde"
)

//go:embed web/prover/pk
var pkBuf []byte

//go:embed web/prover/cs
var csBuf []byte

//go:embed web/vk.json
var vkBuf []byte

type PoseidonCircuit struct {
	In  frontend.Variable `gnark:",public"`
	Out frontend.Variable
}

const rounds = 286

func (c *PoseidonCircuit) Define(api frontend.API) error {
	state := c.In

	params := poseidonnative.GetDefaultParameters()
	h, err := poseidoncircuit.NewPoseidon2FromParameters(api, 2, params.NbFullRounds, params.NbPartialRounds)
	if err != nil {
		return err
	}

	for i := 0; i < rounds; i++ {
		state = h.Compress(state, 0)
	}

	api.AssertIsEqual(c.Out, state)
	return nil
}

var cs *cs_bn254.R1CS
var pk *groth16_bn254.ProvingKey

func main() {
	logger.Disable()

	cs = serde.DeserializeCS(csBuf)
	pk = serde.DeserializePK(pkBuf)

	witness := PoseidonCircuit{
		In:  1,
		Out: "6300423223993071961942742031094861668231719366232256368270642446068946998315",
	}

	start := time.Now()

	fullWitness, err := frontend.NewWitness(&witness, bn254.ID.ScalarField())
	if err != nil {
		log.Fatalf("create witness: %v", err)
	}

	proof, err := groth16_bn254.Prove(cs, pk, fullWitness)
	if err != nil {
		log.Fatalf("prove: %v", err)
	}

	proverMS := time.Since(start).Milliseconds()

	fmt.Printf("[BENCH] gnark_constraints=%d\n", cs.GetNbConstraints())
	fmt.Printf("[BENCH] gnark_prover_ms=%d\n", proverMS)
	_ = proof
}
