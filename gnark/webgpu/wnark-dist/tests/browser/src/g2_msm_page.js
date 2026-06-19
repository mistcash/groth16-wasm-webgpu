import { bytesToHex, fetchJSON, hexToBytes } from "../../../src/curvegpu/browser_utils.js";
import { curveDisplayName } from "./shared/page_library.js";
const CONFIGS = {
    bn254: {
        curve: "bn254",
        title: "BN254 G2 MSM Browser Smoke",
        vectorPath: "/testdata/vectors/g2/bn254_g2_msm.json",
    },
    bls12_377: {
        curve: "bls12_377",
        title: "BLS12-377 G2 MSM Browser Smoke",
        vectorPath: "/testdata/vectors/g2/bls12_377_g2_msm.json",
    },
    bls12_381: {
        curve: "bls12_381",
        title: "BLS12-381 G2 MSM Browser Smoke",
        vectorPath: "/testdata/vectors/g2/bls12_381_g2_msm.json",
    },
};
function fp2FromHex(point) {
    return { c0: hexToBytes(point.c0_bytes_le), c1: hexToBytes(point.c1_bytes_le) };
}
function affineFromHex(point) {
    return { x: fp2FromHex(point.x), y: fp2FromHex(point.y) };
}
function affineToHex(point) {
    return {
        x: { c0_bytes_le: bytesToHex(point.x.c0), c1_bytes_le: bytesToHex(point.x.c1) },
        y: { c0_bytes_le: bytesToHex(point.y.c0), c1_bytes_le: bytesToHex(point.y.c1) },
    };
}
function toAffinePoint(point) {
    return { x: point.x, y: point.y };
}
function equalFp2(a, b) {
    return a.c0_bytes_le === b.c0_bytes_le && a.c1_bytes_le === b.c1_bytes_le;
}
function expectAffineBatch(name, got, want) {
    if (got.length !== want.length) {
        throw new Error(`${name}: length mismatch got=${got.length} want=${want.length}`);
    }
    for (let i = 0; i < got.length; i += 1) {
        const gotHex = affineToHex(got[i]);
        if (!equalFp2(gotHex.x, want[i].x) || !equalFp2(gotHex.y, want[i].y)) {
            throw new Error(`${name}: mismatch at index ${i}` +
                ` got=(${gotHex.x.c0_bytes_le}/${gotHex.x.c1_bytes_le},${gotHex.y.c0_bytes_le}/${gotHex.y.c1_bytes_le})` +
                ` want=(${want[i].x.c0_bytes_le}/${want[i].x.c1_bytes_le},${want[i].y.c0_bytes_le}/${want[i].y.c1_bytes_le})`);
        }
    }
}
async function expectJacobianBatchAffineEqual(module, name, got, want) {
    const affine = await module.g2.jacobianToAffineBatch(got);
    expectAffineBatch(name, affine, want);
}
function packAffinePointsWithOneZ(bases, componentBytes, pointBytes, oneMontC0) {
    const out = new Uint8Array(bases.length * pointBytes);
    for (let i = 0; i < bases.length; i += 1) {
        const base = i * pointBytes;
        out.set(bases[i].x.c0, base);
        out.set(bases[i].x.c1, base + componentBytes);
        out.set(bases[i].y.c0, base + 2 * componentBytes);
        out.set(bases[i].y.c1, base + 3 * componentBytes);
        const isInfinity = bases[i].x.c0.every((byte) => byte === 0) &&
            bases[i].x.c1.every((byte) => byte === 0) &&
            bases[i].y.c0.every((byte) => byte === 0) &&
            bases[i].y.c1.every((byte) => byte === 0);
        if (!isInfinity) {
            out.set(oneMontC0, base + 4 * componentBytes);
        }
    }
    return out;
}
function packScalars(scalars) {
    const out = new Uint8Array(scalars.length * 32);
    for (let i = 0; i < scalars.length; i += 1) {
        out.set(scalars[i], i * 32);
    }
    return out;
}
function unpackJacobianPoints(bytes, count, componentBytes, pointBytes) {
    const out = [];
    for (let i = 0; i < count; i += 1) {
        const base = i * pointBytes;
        out.push({
            x: {
                c0: bytes.slice(base, base + componentBytes),
                c1: bytes.slice(base + componentBytes, base + 2 * componentBytes),
            },
            y: {
                c0: bytes.slice(base + 2 * componentBytes, base + 3 * componentBytes),
                c1: bytes.slice(base + 3 * componentBytes, base + 4 * componentBytes),
            },
            z: {
                c0: bytes.slice(base + 4 * componentBytes, base + 5 * componentBytes),
                c1: bytes.slice(base + 5 * componentBytes, base + 6 * componentBytes),
            },
        });
    }
    return out;
}
async function naiveMSMAffine(module, bases, scalars) {
    const scaled = await module.g2.scalarMulAffineBatch(bases, scalars);
    if (scaled.length === 0) {
        return module.g2.affineInfinity();
    }
    let accJacobian = await module.g2.affineToJacobian(toAffinePoint(scaled[0]));
    for (let i = 1; i < scaled.length; i += 1) {
        accJacobian = await module.g2.addMixed(accJacobian, toAffinePoint(scaled[i]));
    }
    return module.g2.jacobianToAffine(accJacobian);
}
export async function runSuite(module, log) {
    const config = CONFIGS[module.id];
    if (!config) {
        throw new Error(`g2 MSM vectors unavailable for curve ${module.id}`);
    }
    log(`=== ${config.title} ===`);
    log("");
    const vectors = await fetchJSON(config.vectorPath);
    log(`terms_per_instance = ${vectors.terms_per_instance}`);
    log(`cases.msm = ${vectors.msm_cases.length}`);
    const naiveResults = [];
    for (const msmCase of vectors.msm_cases) {
        naiveResults.push(await naiveMSMAffine(module, msmCase.bases_affine.map(affineFromHex), msmCase.scalars_bytes_le.map((value) => hexToBytes(value))));
    }
    expectAffineBatch("msm_naive_affine", naiveResults, vectors.msm_cases.map((item) => item.expected_affine));
    log("msm_naive_affine: OK");
    const window = 4;
    const pippengerResults = await module.g2msm.pippengerAffineBatch(vectors.msm_cases.flatMap((item) => item.bases_affine.map(affineFromHex)), vectors.msm_cases.flatMap((item) => item.scalars_bytes_le.map((value) => hexToBytes(value))), {
        count: vectors.msm_cases.length,
        termsPerInstance: vectors.terms_per_instance,
        window,
    });
    await expectJacobianBatchAffineEqual(module, `msm_jac_pippenger_affine_input (window=${window})`, pippengerResults, vectors.msm_cases.map((item) => item.expected_affine));
    log(`msm_jac_pippenger_affine_input (window=${window}): OK`);
    const oneMontC0 = await module.fp.montOne();
    const packedBases = packAffinePointsWithOneZ(vectors.msm_cases.flatMap((item) => item.bases_affine.map(affineFromHex)), module.g2.componentBytes, module.g2.pointBytes, oneMontC0);
    const packedScalars = packScalars(vectors.msm_cases.flatMap((item) => item.scalars_bytes_le.map((value) => hexToBytes(value))));
    const jacPackedResults = unpackJacobianPoints(await module.g2msm.pippengerPackedJacobianBases(packedBases, packedScalars, {
        count: vectors.msm_cases.length,
        termsPerInstance: vectors.terms_per_instance,
        window,
    }), vectors.msm_cases.length, module.g2.componentBytes, module.g2.pointBytes);
    await expectJacobianBatchAffineEqual(module, `msm_jac_pippenger_packed (window=${window})`, jacPackedResults, vectors.msm_cases.map((item) => item.expected_affine));
    log(`msm_jac_pippenger_packed (window=${window}): OK`);
    log("");
    log(`PASS: ${curveDisplayName(module.id)} G2 MSM browser smoke succeeded`);
    return { passed: 1, failed: 0 };
}
