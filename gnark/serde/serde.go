package serde

import (
	"bytes"

	groth16_bn254 "github.com/consensys/gnark/backend/groth16/bn254"
	cs_bn254 "github.com/consensys/gnark/constraint/bn254"
)

func SerializeCS(cs *cs_bn254.R1CS) []byte {
	var buf bytes.Buffer
	cs.WriteTo(&buf)
	return buf.Bytes()
}

func DeserializeCS(csBuf []byte) *cs_bn254.R1CS {
	cs := &cs_bn254.R1CS{}
	cs.ReadFrom(bytes.NewReader(csBuf))
	return cs
}

func SerializePK(pk *groth16_bn254.ProvingKey) []byte {
	var buf bytes.Buffer
	pk.WriteTo(&buf)
	// pk.WriteDump(&buf)
	return buf.Bytes()
}

func DeserializePK(pkBuf []byte) *groth16_bn254.ProvingKey {
	pk := &groth16_bn254.ProvingKey{}
	pk.UnsafeReadFrom(bytes.NewReader(pkBuf))
	// pk.ReadDump(bytes.NewReader(pkBuf))
	return pk
}
