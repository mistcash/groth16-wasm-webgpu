use ark_bn254::Fr;
use ark_crypto_primitives::sponge::constraints::CryptographicSpongeVar;
use ark_crypto_primitives::sponge::poseidon::constraints::PoseidonSpongeVar;
use ark_crypto_primitives::sponge::poseidon::traits::find_poseidon_ark_and_mds;
use ark_crypto_primitives::sponge::poseidon::{PoseidonConfig, PoseidonSponge};
use ark_crypto_primitives::sponge::{CryptographicSponge, FieldBasedCryptographicSponge};
use ark_ff::PrimeField;
use ark_r1cs_std::{alloc::AllocVar, eq::EqGadget, fields::fp::FpVar};
use ark_relations::gr1cs::{
    ConstraintSynthesizer, ConstraintSystem, ConstraintSystemRef, SynthesisError,
};

pub const ROUNDS: usize = 291;

#[derive(Clone)]
pub struct Poseidon250Circuit {
    pub input: Fr,
    pub output: Fr,
    pub params: PoseidonConfig<Fr>,
}

#[derive(Debug, Clone, Copy)]
pub struct BenchResult {
    pub constraints: usize,
    pub prover_ms: u128,
    pub verified: bool,
}

impl ConstraintSynthesizer<Fr> for Poseidon250Circuit {
    fn generate_constraints(self, cs: ConstraintSystemRef<Fr>) -> Result<(), SynthesisError> {
        let input = FpVar::<Fr>::new_input(cs.clone(), || Ok(self.input))?;
        let output = FpVar::<Fr>::new_witness(cs.clone(), || Ok(self.output))?;

        let mut state = input;
        for _ in 0..ROUNDS {
            let mut sponge = PoseidonSpongeVar::new(cs.clone(), &self.params);
            sponge.absorb(&state)?;
            state = sponge.squeeze_field_elements(1)?[0].clone();
        }

        state.enforce_equal(&output)?;
        Ok(())
    }
}

pub fn build_poseidon_config() -> PoseidonConfig<Fr> {
    let full_rounds = 6;
    let partial_rounds = 50;
    let alpha = 5;
    let rate = 1;
    let capacity = 1;

    let (ark, mds) = find_poseidon_ark_and_mds::<Fr>(
        Fr::MODULUS_BIT_SIZE as u64,
        rate,
        full_rounds as u64,
        partial_rounds as u64,
        0,
    );

    PoseidonConfig::new(full_rounds, partial_rounds, alpha, mds, ark, rate, capacity)
}

pub fn compute_output(input: Fr, params: &PoseidonConfig<Fr>) -> Fr {
    let mut state = input;
    for _ in 0..ROUNDS {
        let mut sponge = PoseidonSponge::new(params);
        sponge.absorb(&state);
        state = sponge.squeeze_native_field_elements(1)[0];
    }
    state
}

pub fn build_circuit() -> Poseidon250Circuit {
    let params = build_poseidon_config();
    let input = Fr::from(1u64);
    let output = compute_output(input, &params);

    Poseidon250Circuit {
        input,
        output,
        params,
    }
}

pub fn constraint_count(circuit: &Poseidon250Circuit) -> Result<usize, String> {
    let cs = ConstraintSystem::<Fr>::new_ref();
    circuit
        .clone()
        .generate_constraints(cs.clone())
        .map_err(|err| format!("constraints generation failed: {err}"))?;
    cs.finalize();
    Ok(cs.num_constraints())
}
