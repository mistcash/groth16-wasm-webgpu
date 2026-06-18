#![allow(dead_code)]

#[path = "src/circuit.rs"]
mod circuit;

use ark_bn254::Bn254;
use ark_groth16::Groth16;
use ark_serialize::CanonicalSerialize;
use ark_snark::SNARK;
use ark_std::rand::rngs::StdRng;
use ark_std::rand::SeedableRng;
use std::env;
use std::fs::File;
use std::io::{BufWriter, Write};
use std::path::PathBuf;

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    println!("cargo:rerun-if-changed=src/circuit.rs");

    let circuit = circuit::build_circuit();
    let mut rng = StdRng::seed_from_u64(1);

    let (pk, vk) =
        Groth16::<Bn254>::circuit_specific_setup(circuit, &mut rng).expect("groth16 setup failed");

    let out_dir = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR not set"));
    let setup_path = out_dir.join("groth16_setup.bin");
    let file = File::create(&setup_path).expect("failed to create setup file");
    let mut writer = BufWriter::new(file);

    pk.serialize_uncompressed(&mut writer)
        .expect("failed to write proving key");
    vk.serialize_uncompressed(&mut writer)
        .expect("failed to write verifying key");
    writer.flush().expect("failed to flush setup file");
}
