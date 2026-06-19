//go:build js && wasm

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"syscall/js"

	"github.com/consensys/gnark-crypto/ecc"
	"github.com/consensys/gnark/frontend"
)

type PoseidonCircuit struct {
	In  frontend.Variable `gnark:",public"`
	Out frontend.Variable
}

// Define satisfies frontend.Circuit; witness creation never calls it.
func (c *PoseidonCircuit) Define(_ frontend.API) error { return nil }

func main() {
	js.Global().Set("poseidonCreateWitness", js.FuncOf(createWitness))
	select {}
}

func createWitness(_ js.Value, args []js.Value) any {
	if len(args) < 1 || args[0].Type() != js.TypeString {
		return js.Global().Get("Error").New("poseidonCreateWitness: expected JSON string")
	}
	var raw struct {
		In  string `json:"In"`
		Out string `json:"Out"`
	}
	if err := json.Unmarshal([]byte(args[0].String()), &raw); err != nil {
		return js.Global().Get("Error").New(fmt.Sprintf("poseidonCreateWitness: parse: %v", err))
	}
	assignment := PoseidonCircuit{In: raw.In, Out: raw.Out}
	w, err := frontend.NewWitness(&assignment, ecc.BN254.ScalarField())
	if err != nil {
		return js.Global().Get("Error").New(fmt.Sprintf("poseidonCreateWitness: build witness: %v", err))
	}
	var buf bytes.Buffer
	if _, err := w.WriteTo(&buf); err != nil {
		return js.Global().Get("Error").New(fmt.Sprintf("poseidonCreateWitness: serialize: %v", err))
	}
	out := js.Global().Get("Uint8Array").New(buf.Len())
	js.CopyBytesToJS(out, buf.Bytes())
	return out
}
