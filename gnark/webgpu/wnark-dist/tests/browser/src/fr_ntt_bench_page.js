import { createPageUI, mustElement } from "../../../src/curvegpu/browser_utils.js";
import { benchmarkTotalDuration } from "./shared/bench_total.js";
import { appendContextDiagnostics, createRequestedCurveModule, curveDisplayName, getRequestedCurveId } from "./shared/page_library.js";
const CONFIGS = {
    bn254: {
        curve: "bn254",
        title: "BN254 fr NTT Browser Benchmark",
        successMessage: "BN254 fr NTT browser benchmark completed",
    },
    bls12_377: {
        curve: "bls12_377",
        title: "BLS12-377 fr NTT Browser Benchmark",
        successMessage: "BLS12-377 fr NTT browser benchmark completed",
    },
    bls12_381: {
        curve: "bls12_381",
        title: "BLS12-381 fr NTT Browser Benchmark",
        successMessage: "BLS12-381 fr NTT browser benchmark completed",
    },
};
const ELEMENT_BYTES = 32;
const minLogEl = document.getElementById("min-log");
const maxLogEl = document.getElementById("max-log");
const itersEl = document.getElementById("iters");
const runButton = document.getElementById("run");
const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");
const { setStatus, setPageState, writeLog } = createPageUI(statusEl, logEl);
function getConfig() {
    const curve = getRequestedCurveId();
    const config = CONFIGS[curve];
    if (!config) {
        throw new Error(`fr NTT benchmark unavailable for curve ${curve}`);
    }
    return config;
}
function makeRegularBatch(count, seed) {
    const out = [];
    let state = seed >>> 0;
    for (let i = 0; i < count; i += 1) {
        const value = new Uint8Array(ELEMENT_BYTES);
        for (let byteIndex = 0; byteIndex < ELEMENT_BYTES; byteIndex += 1) {
            state ^= state << 13;
            state ^= state >>> 17;
            state ^= state << 5;
            value[byteIndex] = state & 0xff;
        }
        out.push(value);
    }
    return out;
}
async function runBenchmark() {
    const config = getConfig();
    const lines = [`=== ${config.title} ===`, ""];
    writeLog(lines);
    setStatus("Running");
    setPageState("running");
    mustElement(runButton, "run").disabled = true;
    try {
        const minLog = Number.parseInt(mustElement(minLogEl, "min-log").value, 10);
        const maxLog = Number.parseInt(mustElement(maxLogEl, "max-log").value, 10);
        const iters = Number.parseInt(mustElement(itersEl, "iters").value, 10);
        if (!Number.isInteger(minLog) || !Number.isInteger(maxLog) || !Number.isInteger(iters) || minLog < 1 || maxLog < minLog || iters < 1) {
            throw new Error("invalid benchmark controls");
        }
        const initStart = performance.now();
        const curve = await createRequestedCurveModule(config.curve);
        const initMs = performance.now() - initStart;
        lines.push("1. Requesting adapter... OK");
        appendContextDiagnostics(lines, curve.context);
        lines.push("2. Requesting device... OK");
        lines.push("3. Initializing curve module... OK");
        lines.push(`init_ms = ${initMs.toFixed(3)}`);
        lines.push("");
        lines.push("size,op,init_ms,cold_total_ms,cold_with_init_ms,warm_total_ms");
        writeLog(lines);
        for (let logSize = minLog; logSize <= maxLog; logSize += 1) {
            const size = 1 << logSize;
            const regularValues = makeRegularBatch(size, 0x9e3779b9 ^ size);
            const inputMont = await curve.fr.toMontgomeryBatch(regularValues);
            const forwardBenchmark = await benchmarkTotalDuration(iters, async () => {
                await curve.ntt.forward(inputMont);
            });
            lines.push([
                `${size}`,
                "forward_ntt",
                initMs.toFixed(3),
                forwardBenchmark.coldMs.toFixed(3),
                (initMs + forwardBenchmark.coldMs).toFixed(3),
                forwardBenchmark.warmMs.toFixed(3),
            ].join(","));
            writeLog(lines);
            const forwardValues = await curve.ntt.forward(inputMont);
            const inverseBenchmark = await benchmarkTotalDuration(iters, async () => {
                await curve.ntt.inverse(forwardValues);
            });
            lines.push([
                `${size}`,
                "inverse_ntt",
                initMs.toFixed(3),
                inverseBenchmark.coldMs.toFixed(3),
                (initMs + inverseBenchmark.coldMs).toFixed(3),
                inverseBenchmark.warmMs.toFixed(3),
            ].join(","));
            writeLog(lines);
        }
        lines.push("");
        lines.push(`PASS: ${config.successMessage}`);
        writeLog(lines);
        setStatus("Pass");
        setPageState("pass");
    }
    catch (error) {
        lines.push(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
        writeLog(lines);
        setStatus("Fail");
        setPageState("fail");
    }
    finally {
        mustElement(runButton, "run").disabled = false;
    }
}
mustElement(runButton, "run").addEventListener("click", () => {
    void runBenchmark();
});
const config = getConfig();
writeLog([
    `=== ${config.title} ===`,
    "",
    `Press Run to benchmark ${curveDisplayName(config.curve)} fr NTT in browser WebGPU.`,
]);
