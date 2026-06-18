mod circuit;

use ark_bn254::Bn254;
use ark_groth16::{Groth16, Proof, ProvingKey, VerifyingKey};
use ark_serialize::CanonicalDeserialize;
use ark_snark::SNARK;
use ark_std::rand::rngs::StdRng;
use ark_std::rand::SeedableRng;
use std::cell::RefCell;
use std::io::Cursor;
use wasm_bindgen::prelude::*;

pub use circuit::{build_circuit, constraint_count, BenchResult, Poseidon250Circuit, ROUNDS};

struct BrowserBenchState {
    circuit: Poseidon250Circuit,
    pk: ProvingKey<Bn254>,
    vk: VerifyingKey<Bn254>,
    constraints: usize,
}

thread_local! {
    static BROWSER_BENCH_STATE: RefCell<Option<BrowserBenchState>> = const { RefCell::new(None) };
}

struct Timer(
    #[cfg(target_arch = "wasm32")] f64,
    #[cfg(not(target_arch = "wasm32"))] std::time::Instant,
);

impl Timer {
    fn new() -> Self {
        #[cfg(target_arch = "wasm32")]
        return Timer(js_sys::Date::now());
        #[cfg(not(target_arch = "wasm32"))]
        return Timer(std::time::Instant::now());
    }

    fn elapsed_ms(&self) -> u128 {
        #[cfg(target_arch = "wasm32")]
        return (js_sys::Date::now() - self.0).round() as u128;
        #[cfg(not(target_arch = "wasm32"))]
        return self.0.elapsed().as_millis();
    }
}

pub fn trusted_setup_bytes() -> &'static [u8] {
    include_bytes!(concat!(env!("OUT_DIR"), "/groth16_setup.bin"))
}

fn load_setup() -> Result<(ProvingKey<Bn254>, VerifyingKey<Bn254>), String> {
    let mut cursor = Cursor::new(trusted_setup_bytes());

    let pk = ProvingKey::<Bn254>::deserialize_uncompressed(&mut cursor)
        .map_err(|err| format!("failed to load proving key: {err}"))?;
    let vk = VerifyingKey::<Bn254>::deserialize_uncompressed(&mut cursor)
        .map_err(|err| format!("failed to load verifying key: {err}"))?;

    Ok((pk, vk))
}

pub fn run_bench() -> Result<BenchResult, String> {
    let circuit = build_circuit();
    let constraints = constraint_count(&circuit)?;
    let mut rng = StdRng::seed_from_u64(2);
    let (pk, vk) = load_setup()?;

    let timer = Timer::new();
    let proof: Proof<Bn254> = Groth16::<Bn254>::prove(&pk, circuit.clone(), &mut rng)
        .map_err(|err| format!("groth16 prove failed: {err}"))?;
    let prover_ms = timer.elapsed_ms();

    let public_inputs = vec![circuit.input];
    let verified = Groth16::<Bn254>::verify(&vk, &public_inputs, &proof)
        .map_err(|err| format!("verify failed: {err}"))?;

    Ok(BenchResult {
        constraints,
        prover_ms,
        verified,
    })
}

#[wasm_bindgen(start)]
pub fn init_panic_hook() {
    #[cfg(target_arch = "wasm32")]
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub fn run_browser_setup() -> Result<String, JsValue> {
    let circuit = build_circuit();
    let constraints = constraint_count(&circuit).map_err(|err| JsValue::from_str(&err))?;

    let timer = Timer::new();
    let (pk, vk) = load_setup().map_err(|err| JsValue::from_str(&err))?;
    let setup_ms = timer.elapsed_ms();

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

        let timer = Timer::new();
        let proof: Proof<Bn254> =
            Groth16::<Bn254>::prove(&browser_state.pk, browser_state.circuit.clone(), &mut rng)
                .map_err(|err| JsValue::from_str(&format!("groth16 prove failed: {err}")))?;
        let prover_ms = timer.elapsed_ms();

        let public_inputs = vec![browser_state.circuit.input];
        let verified = Groth16::<Bn254>::verify(&browser_state.vk, &public_inputs, &proof)
            .map_err(|err| JsValue::from_str(&format!("verify failed: {err}")))?;

        Ok(format!(
            "arkworks_constraints={}\n\n[BENCH] arkworks_prover_ms={}\n\narkworks_verified={}",
            browser_state.constraints, prover_ms, verified
        ))
    })
}

#[cfg(test)]
mod tests {
    use wasm_bindgen_test::wasm_bindgen_test;

    use super::*;

    // wasm_bindgen_test::wasm_bindgen_test_configure!(run_in_browser);

    #[wasm_bindgen_test]
    fn test_run_browser_proof() {
        // Setup must be called first to populate BROWSER_BENCH_STATE
        let setup_result = run_browser_setup().unwrap();
        assert!(setup_result.contains("arkworks_constraints="));
        assert!(setup_result.contains("arkworks_setup_ms="));

        // Now proof generation should succeed
        let proof_result = run_browser_proof().unwrap();
        assert!(proof_result.contains("arkworks_prover_ms="));
        assert!(proof_result.contains("arkworks_verified=true"));
    }
}
