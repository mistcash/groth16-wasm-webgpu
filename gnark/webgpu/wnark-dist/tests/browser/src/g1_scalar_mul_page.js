import { bytesToHex, fetchJSON, hexToBytes } from "../../../src/curvegpu/browser_utils.js";
import { curveDisplayName } from "./shared/page_library.js";
const CONFIGS = {
    bn254: {
        curve: "bn254",
        title: "BN254 G1 Scalar Mul Browser Smoke",
        vectorPath: "/testdata/vectors/g1/bn254_g1_scalar_mul.json",
    },
    bls12_377: {
        curve: "bls12_377",
        title: "BLS12-377 G1 Scalar Mul Browser Smoke",
        vectorPath: "/testdata/vectors/g1/bls12_377_g1_scalar_mul.json",
    },
    bls12_381: {
        curve: "bls12_381",
        title: "BLS12-381 G1 Scalar Mul Browser Smoke",
        vectorPath: "/testdata/vectors/g1/bls12_381_g1_scalar_mul.json",
    },
};
function affineFromHex(point) {
    return { x: hexToBytes(point.x_bytes_le), y: hexToBytes(point.y_bytes_le) };
}
function jacobianToHex(point) {
    return {
        x_bytes_le: bytesToHex(point.x),
        y_bytes_le: bytesToHex(point.y),
        z_bytes_le: bytesToHex(point.z),
    };
}
function expectPointBatch(name, got, want, log) {
    if (got.length !== want.length) {
        throw new Error(`${name}: length mismatch got=${got.length} want=${want.length}`);
    }
    for (let i = 0; i < got.length; i += 1) {
        const gotHex = jacobianToHex(got[i]);
        if (gotHex.x_bytes_le !== want[i].x_bytes_le ||
            gotHex.y_bytes_le !== want[i].y_bytes_le ||
            gotHex.z_bytes_le !== want[i].z_bytes_le) {
            throw new Error(`${name}: mismatch at index ${i}`);
        }
    }
    log(`${name}: OK`);
}
export async function runSuite(module, log) {
    const config = CONFIGS[module.id];
    if (!config) {
        throw new Error(`g1 scalar-mul vectors unavailable for curve ${module.id}`);
    }
    log(`=== ${config.title} ===`);
    log("");
    const vectors = await fetchJSON(config.vectorPath);
    log(`cases.scalar = ${vectors.scalar_cases.length}`);
    log(`cases.base = ${vectors.base_cases.length}`);
    const scalarBases = vectors.scalar_cases.map((item) => affineFromHex(item.base_affine));
    const scalarScalars = vectors.scalar_cases.map((item) => hexToBytes(item.scalar_bytes_le));
    const scalarWant = vectors.scalar_cases.map((item) => item.scalar_mul_affine);
    expectPointBatch("scalar_mul_affine", await module.g1.scalarMulAffineBatch(scalarBases, scalarScalars), scalarWant, log);
    const generator = affineFromHex(vectors.generator_affine);
    const baseBases = Array.from({ length: vectors.base_cases.length }, () => generator);
    const baseScalars = vectors.base_cases.map((item) => hexToBytes(item.scalar_bytes_le));
    const baseWant = vectors.base_cases.map((item) => item.scalar_mul_base_affine);
    expectPointBatch("scalar_mul_base_affine", await module.g1.scalarMulAffineBatch(baseBases, baseScalars), baseWant, log);
    log("");
    log(`PASS: ${curveDisplayName(module.id)} G1 scalar mul browser smoke succeeded`);
    return { passed: 1, failed: 0 };
}
