import { bytesToHex, fetchJSON, hexToBytes } from "../../../src/curvegpu/browser_utils.js";
import { curveDisplayName } from "./shared/page_library.js";
const CONFIGS = {
    bn254: {
        curve: "bn254",
        title: "BN254 G2 Ops Browser Smoke",
        vectorPath: "/testdata/vectors/g2/bn254_g2_ops.json",
    },
    bls12_377: {
        curve: "bls12_377",
        title: "BLS12-377 G2 Ops Browser Smoke",
        vectorPath: "/testdata/vectors/g2/bls12_377_g2_ops.json",
    },
    bls12_381: {
        curve: "bls12_381",
        title: "BLS12-381 G2 Ops Browser Smoke",
        vectorPath: "/testdata/vectors/g2/bls12_381_g2_ops.json",
    },
};
function fp2FromHex(point) {
    return { c0: hexToBytes(point.c0_bytes_le), c1: hexToBytes(point.c1_bytes_le) };
}
function affineFromHex(point) {
    return { x: fp2FromHex(point.x), y: fp2FromHex(point.y) };
}
function jacobianFromHex(point) {
    return { x: fp2FromHex(point.x), y: fp2FromHex(point.y), z: fp2FromHex(point.z) };
}
function fp2ToHex(point) {
    return { c0_bytes_le: bytesToHex(point.c0), c1_bytes_le: bytesToHex(point.c1) };
}
function affineToHex(point) {
    return { x: fp2ToHex(point.x), y: fp2ToHex(point.y) };
}
function jacobianToHex(point) {
    return { x: fp2ToHex(point.x), y: fp2ToHex(point.y), z: fp2ToHex(point.z) };
}
function equalFp2(a, b) {
    return a.c0_bytes_le === b.c0_bytes_le && a.c1_bytes_le === b.c1_bytes_le;
}
function expectPointBatch(name, got, want, log) {
    if (got.length !== want.length) {
        throw new Error(`${name}: length mismatch got=${got.length} want=${want.length}`);
    }
    for (let i = 0; i < got.length; i += 1) {
        const gotHex = jacobianToHex(got[i]);
        if (!equalFp2(gotHex.x, want[i].x) ||
            !equalFp2(gotHex.y, want[i].y) ||
            !equalFp2(gotHex.z, want[i].z)) {
            throw new Error(`${name}: mismatch at index ${i}`);
        }
    }
    log(`${name}: OK`);
}
function expectAffineBatch(name, got, want, log) {
    if (got.length !== want.length) {
        throw new Error(`${name}: length mismatch got=${got.length} want=${want.length}`);
    }
    for (let i = 0; i < got.length; i += 1) {
        const gotHex = affineToHex(got[i]);
        if (!equalFp2(gotHex.x, want[i].x) || !equalFp2(gotHex.y, want[i].y)) {
            throw new Error(`${name}: mismatch at index ${i}`);
        }
    }
    log(`${name}: OK`);
}
function zeroFp2(componentBytes) {
    const zero = bytesToHex(new Uint8Array(componentBytes));
    return { c0_bytes_le: zero, c1_bytes_le: zero };
}
export async function runSuite(module, log) {
    const config = CONFIGS[module.id];
    if (!config) {
        throw new Error(`g2 ops vectors unavailable for curve ${module.id}`);
    }
    log(`=== ${config.title} ===`);
    log("");
    const vectors = await fetchJSON(config.vectorPath);
    log(`cases.g2 = ${vectors.point_cases.length}`);
    const g2 = module.g2;
    const pAffine = vectors.point_cases.map((item) => affineFromHex(item.p_affine));
    const qAffine = vectors.point_cases.map((item) => affineFromHex(item.q_affine));
    const pJacobian = vectors.point_cases.map((item) => jacobianFromHex(item.p_jacobian));
    const negWant = vectors.point_cases.map((item) => item.neg_p_jacobian);
    const doubleWant = vectors.point_cases.map((item) => item.double_p_jacobian);
    const addWant = vectors.point_cases.map((item) => item.add_mixed_p_plus_q_jacobian);
    const affineWant = vectors.point_cases.map((item) => ({
        x: item.p_affine_output.x,
        y: item.p_affine_output.y,
    }));
    const affineAddWant = vectors.point_cases.map((item) => item.affine_add_p_plus_q);
    const oneMont = await module.fp.montOne();
    const oneFp2 = { c0_bytes_le: bytesToHex(oneMont), c1_bytes_le: bytesToHex(module.fp.zero()) };
    const zero = zeroFp2(g2.componentBytes);
    const jacInfinityWant = vectors.point_cases.map(() => ({ x: oneFp2, y: oneFp2, z: zero }));
    expectPointBatch("copy", await g2.copyBatch(pJacobian), vectors.point_cases.map((item) => item.p_jacobian), log);
    expectPointBatch("jac_infinity", await g2.jacobianInfinityBatch(vectors.point_cases.length), jacInfinityWant, log);
    expectPointBatch("affine_to_jac", await g2.affineToJacobianBatch(pAffine), vectors.point_cases.map((item) => item.p_jacobian), log);
    expectPointBatch("neg_jac", await g2.negJacobianBatch(pJacobian), negWant, log);
    expectAffineBatch("jac_to_affine", await g2.jacobianToAffineBatch(pJacobian), affineWant, log);
    expectPointBatch("double_jac", await g2.doubleJacobianBatch(pJacobian), doubleWant, log);
    expectPointBatch("add_mixed", await g2.addMixedBatch(pJacobian, qAffine), addWant, log);
    expectPointBatch("affine_add", await g2.affineAddBatch(pAffine, qAffine), affineAddWant, log);
    log("");
    log(`PASS: ${curveDisplayName(module.id)} G2 browser smoke succeeded`);
    return { passed: 1, failed: 0 };
}
