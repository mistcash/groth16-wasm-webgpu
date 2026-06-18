use zk_bench_arkworks::run_bench;

fn main() {
    let result = run_bench().expect("arkworks benchmark");
    assert!(result.verified, "proof verification failed");

    println!("[BENCH] arkworks_constraints={}", result.constraints);
    println!("[BENCH] arkworks_prover_ms={}", result.prover_ms);
}
