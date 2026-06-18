use ark_bn254::{Bn254, Fr};
use ark_ff::PrimeField;
use ark_crypto_primitives::sponge::constraints::CryptographicSpongeVar;
use ark_crypto_primitives::sponge::poseidon::constraints::PoseidonSpongeVar;
use ark_crypto_primitives::sponge::poseidon::traits::find_poseidon_ark_and_mds;
use ark_crypto_primitives::sponge::poseidon::{PoseidonConfig, PoseidonSponge};
use ark_crypto_primitives::sponge::{CryptographicSponge, FieldBasedCryptographicSponge};
use ark_groth16::{Groth16, Proof, ProvingKey, VerifyingKey};
use ark_r1cs_std::{alloc::AllocVar, eq::EqGadget, fields::fp::FpVar};
use ark_relations::gr1cs::{
    ConstraintSynthesizer, ConstraintSystem, ConstraintSystemRef, SynthesisError,
};
use ark_snark::SNARK;
use ark_std::rand::rngs::StdRng;
use ark_std::rand::SeedableRng;
use std::cell::RefCell;
use wasm_bindgen::prelude::*;

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

struct BrowserBenchState {
    circuit: Poseidon250Circuit,
    pk: ProvingKey<Bn254>,
    vk: VerifyingKey<Bn254>,
    constraints: usize,
}

thread_local! {
    static BROWSER_BENCH_STATE: RefCell<Option<BrowserBenchState>> = const { RefCell::new(None) };
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

pub fn run_bench() -> Result<BenchResult, String> {
    let circuit = build_circuit();
    let constraints = constraint_count(&circuit)?;
    let mut rng = StdRng::seed_from_u64(1);

    let (pk, vk): (ProvingKey<Bn254>, VerifyingKey<Bn254>) =
        Groth16::<Bn254>::circuit_specific_setup(circuit.clone(), &mut rng)
            .map_err(|err| format!("groth16 setup failed: {err}"))?;

    #[cfg(target_arch = "wasm32")]
    let start_ms = js_sys::Date::now();
    #[cfg(not(target_arch = "wasm32"))]
    let start = std::time::Instant::now();

    let proof: Proof<Bn254> = Groth16::<Bn254>::prove(&pk, circuit.clone(), &mut rng)
        .map_err(|err| format!("groth16 prove failed: {err}"))?;

    #[cfg(target_arch = "wasm32")]
    let prover_ms = (js_sys::Date::now() - start_ms).round() as u128;
    #[cfg(not(target_arch = "wasm32"))]
    let prover_ms = start.elapsed().as_millis();

    let public_inputs = vec![circuit.input];
    let verified = Groth16::<Bn254>::verify(&vk, &public_inputs, &proof)
        .map_err(|err| format!("verify failed: {err}"))?;

    Ok(BenchResult {
        constraints,
        prover_ms,
        verified,
    })
}

#[wasm_bindgen]
pub fn run_browser_setup() -> Result<String, JsValue> {
    let circuit = build_circuit();
    let constraints = constraint_count(&circuit).map_err(|err| JsValue::from_str(&err))?;
    let mut rng = StdRng::seed_from_u64(1);

    #[cfg(target_arch = "wasm32")]
    let start_ms = js_sys::Date::now();
    #[cfg(not(target_arch = "wasm32"))]
    let start = std::time::Instant::now();

    let (pk, vk): (ProvingKey<Bn254>, VerifyingKey<Bn254>) =
        Groth16::<Bn254>::circuit_specific_setup(circuit.clone(), &mut rng)
            .map_err(|err| JsValue::from_str(&format!("groth16 setup failed: {err}")))?;

    #[cfg(target_arch = "wasm32")]
    let setup_ms = (js_sys::Date::now() - start_ms).round() as u128;
    #[cfg(not(target_arch = "wasm32"))]
    let setup_ms = start.elapsed().as_millis();

    BROWSER_BENCH_STATE.with(|state| {
        *state.borrow_mut() = Some(BrowserBenchState {
            circuit,
            pk,
            vk,
            constraints,
        });
    });

    Ok(format!(
        "arkworks_constraints={}\narkworks_setup_ms={}",
        constraints, setup_ms
    ))
}

#[wasm_bindgen]
pub fn run_browser_proof() -> Result<String, JsValue> {
    BROWSER_BENCH_STATE.with(|state| {
        let state = state.borrow();
        let Some(browser_state) = state.as_ref() else {
            return Err(JsValue::from_str(
                "setup has not been run yet; click 'Run setup' first",
            ));
        };

        let mut rng = StdRng::seed_from_u64(2);

        #[cfg(target_arch = "wasm32")]
        let start_ms = js_sys::Date::now();
        #[cfg(not(target_arch = "wasm32"))]
        let start = std::time::Instant::now();

        let proof: Proof<Bn254> =
            Groth16::<Bn254>::prove(&browser_state.pk, browser_state.circuit.clone(), &mut rng)
                .map_err(|err| JsValue::from_str(&format!("groth16 prove failed: {err}")))?;

        #[cfg(target_arch = "wasm32")]
        let prover_ms = (js_sys::Date::now() - start_ms).round() as u128;
        #[cfg(not(target_arch = "wasm32"))]
        let prover_ms = start.elapsed().as_millis();

        let public_inputs = vec![browser_state.circuit.input];
        let verified = Groth16::<Bn254>::verify(&browser_state.vk, &public_inputs, &proof)
            .map_err(|err| JsValue::from_str(&format!("verify failed: {err}")))?;

        Ok(format!(
            "arkworks_constraints={}\n\n[BENCH] arkworks_prover_ms={}\n\narkworks_verified={}",
            browser_state.constraints, prover_ms, verified
        ))
    })
}
