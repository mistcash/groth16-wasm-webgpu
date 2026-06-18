use ark_bls12_381::{Bls12_381, Fr};
use ark_ff::PrimeField;
use ark_groth16::{Groth16, Proof, ProvingKey, VerifyingKey};
use ark_r1cs_std::{alloc::AllocVar, eq::EqGadget, fields::fp::FpVar};
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystem, ConstraintSystemRef, SynthesisError};
use ark_snark::SNARK;
use ark_sponge::constraints::CryptographicSpongeVar;
use ark_sponge::poseidon::constraints::PoseidonSpongeVar;
use ark_sponge::poseidon::traits::find_poseidon_ark_and_mds;
use ark_sponge::poseidon::{PoseidonConfig, PoseidonSponge};
use ark_sponge::{CryptographicSponge, FieldBasedCryptographicSponge};
use rand::thread_rng;
use std::time::Instant;

const ROUNDS: usize = 250;

#[derive(Clone)]
struct Poseidon250Circuit {
    pub input: Fr,
    pub output: Fr,
    pub params: PoseidonConfig<Fr>,
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

fn build_poseidon_config() -> PoseidonConfig<Fr> {
    let full_rounds = 8;
    let partial_rounds = 57;
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

fn compute_output(input: Fr, params: &PoseidonConfig<Fr>) -> Fr {
    let mut state = input;
    for _ in 0..ROUNDS {
        let mut sponge = PoseidonSponge::new(params);
        sponge.absorb(&state);
        state = sponge.squeeze_native_field_elements(1)[0];
    }
    state
}

fn main() {
    let mut rng = thread_rng();
    let params = build_poseidon_config();

    let input = Fr::from(1u64);
    let output = compute_output(input, &params);

    let circuit = Poseidon250Circuit {
        input,
        output,
        params: params.clone(),
    };

    let cs = ConstraintSystem::<Fr>::new_ref();
    circuit
        .clone()
        .generate_constraints(cs.clone())
        .expect("constraints generation");
    cs.finalize();
    let constraints = cs.num_constraints();

    let (pk, vk): (ProvingKey<Bls12_381>, VerifyingKey<Bls12_381>) =
        Groth16::<Bls12_381>::circuit_specific_setup(circuit.clone(), &mut rng)
            .expect("groth16 setup");

    let start = Instant::now();
    let proof: Proof<Bls12_381> =
        Groth16::<Bls12_381>::prove(&pk, circuit.clone(), &mut rng).expect("groth16 prove");
    let prover_ms = start.elapsed().as_millis();

    let public_inputs = vec![input];
    let verified = Groth16::<Bls12_381>::verify(&vk, &public_inputs, &proof).expect("verify");
    assert!(verified, "proof verification failed");

    println!("arkworks_constraints={constraints}");
    println!("arkworks_prover_ms={prover_ms}");
}
