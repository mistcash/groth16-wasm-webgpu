import { createCurveGPUContext, createCurveModule } from "../../../src/index.js";
import { appendContextDiagnostics } from "./shared/page_library.js";
const BENCH_MIN_LOG = 10;
const BENCH_MAX_LOG = 20;
const CURVES = ["bn254", "bls12_377", "bls12_381"];
const SMOKE_SUITES = [
    { id: "fr_ops", label: "fr ops", kind: "smoke", script: "/web/dist/tests/browser/src/fr_ops_page.js" },
    { id: "fp_ops", label: "fp ops", kind: "smoke", script: "/web/dist/tests/browser/src/fp_ops_page.js" },
    { id: "fr_vector_ops", label: "fr vector ops", kind: "smoke", script: "/web/dist/tests/browser/src/fr_vector_ops_page.js" },
    { id: "fr_ntt", label: "fr NTT", kind: "smoke", script: "/web/dist/tests/browser/src/fr_ntt_page.js" },
    { id: "g1_ops", label: "G1 ops", kind: "smoke", script: "/web/dist/tests/browser/src/g1_ops_page.js" },
    { id: "g2_ops", label: "G2 ops", kind: "smoke", script: "/web/dist/tests/browser/src/g2_ops_page.js" },
    { id: "g1_scalar_mul", label: "G1 scalar mul", kind: "smoke", script: "/web/dist/tests/browser/src/g1_scalar_mul_page.js" },
    { id: "g1_msm", label: "G1 MSM", kind: "smoke", script: "/web/dist/tests/browser/src/g1_msm_page.js" },
    { id: "g2_msm", label: "G2 MSM", kind: "smoke", script: "/web/dist/tests/browser/src/g2_msm_page.js" },
];
const BENCH_SUITES = [
    { id: "fr_vector_bench", label: "fr vector bench", kind: "bench", script: "/web/dist/tests/browser/src/fr_vector_bench_page.js", defaultIters: 3 },
    { id: "fr_ntt_bench", label: "fr NTT bench", kind: "bench", script: "/web/dist/tests/browser/src/fr_ntt_bench_page.js", defaultIters: 1 },
    { id: "g1_msm_bench", label: "G1 MSM bench", kind: "bench", script: "/web/dist/tests/browser/src/g1_msm_bench_page.js", defaultIters: 1 },
    { id: "g2_msm_bench", label: "G2 MSM bench", kind: "bench", script: "/web/dist/tests/browser/src/g2_msm_bench_page.js", defaultIters: 1 },
];
const SUITES = CURVES.flatMap((curve) => [
    ...SMOKE_SUITES.map((suite) => ({ curve, ...suite })),
    ...BENCH_SUITES.map((suite) => ({
        curve,
        ...suite,
        defaultMinLog: BENCH_MIN_LOG,
        defaultMaxLog: BENCH_MAX_LOG,
    })),
]);
function getById(id) {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLElement)) {
        throw new Error(`missing element: ${id}`);
    }
    return el;
}
function makeLogger(logEl) {
    const lines = [];
    return (msg) => {
        lines.push(msg);
        logEl.textContent = lines.join("\n");
    };
}
async function buildModule(curve, log) {
    const context = await createCurveGPUContext();
    const diagLines = [];
    appendContextDiagnostics(diagLines, context);
    for (const line of diagLines) {
        log(line);
    }
    return createCurveModule(context, curve);
}
async function runAllSmoke(module, suites, log) {
    let passed = 0;
    let failed = 0;
    for (const suite of suites) {
        try {
            const mod = await import(suite.script);
            const result = await mod.runSuite(module, log);
            passed += result.passed;
            failed += result.failed;
        }
        catch (error) {
            log(`FAIL [${suite.id}]: ${error instanceof Error ? error.message : String(error)}`);
            failed += 1;
        }
    }
    return { passed, failed };
}
function populateSelectors(curveSelect, suiteSelect, curve, suiteId) {
    const curves = [...new Set(SUITES.map((s) => s.curve))];
    curveSelect.replaceChildren();
    for (const c of curves) {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        if (c === curve) {
            opt.selected = true;
        }
        curveSelect.appendChild(opt);
    }
    function updateSuiteOptions(selectedCurve) {
        suiteSelect.replaceChildren();
        const addOpt = (value, text, selected) => {
            const opt = document.createElement("option");
            opt.value = value;
            opt.textContent = text;
            if (selected) {
                opt.selected = true;
            }
            suiteSelect.appendChild(opt);
        };
        addOpt("all", "all smoke", suiteId === "all");
        for (const s of SUITES.filter((entry) => entry.curve === selectedCurve)) {
            addOpt(s.id, s.label, s.id === suiteId);
        }
    }
    updateSuiteOptions(curve);
    curveSelect.addEventListener("change", () => {
        updateSuiteOptions(curveSelect.value);
    });
}
async function main() {
    const params = new URLSearchParams(window.location.search);
    const curve = (params.get("curve") ?? "bn254");
    const suiteId = params.get("suite") ?? "fr_ops";
    const logEl = getById("log");
    const statusEl = getById("status");
    const runButton = getById("run");
    const curveSelect = getById("curve-select");
    const suiteSelect = getById("suite-select");
    const openButton = getById("open-suite");
    const benchControls = getById("bench-controls");
    populateSelectors(curveSelect, suiteSelect, curve, suiteId);
    openButton.addEventListener("click", () => {
        const newParams = new URLSearchParams(window.location.search);
        newParams.set("curve", curveSelect.value);
        newParams.set("suite", suiteSelect.value);
        window.location.search = newParams.toString();
    });
    function setStatus(s) {
        statusEl.textContent = s;
    }
    function setPageState(s) {
        document.body.setAttribute("data-status", s);
    }
    if (suiteId === "all") {
        const smokeSuites = SUITES.filter((s) => s.curve === curve && s.kind === "smoke");
        const runAll = async () => {
            runButton.disabled = true;
            setStatus("Running");
            setPageState("running");
            const log = makeLogger(logEl);
            try {
                const module = await buildModule(curve, log);
                const result = await runAllSmoke(module, smokeSuites, log);
                log("");
                log(`Total: ${result.passed} passed, ${result.failed} failed`);
                setStatus(result.failed === 0 ? "Pass" : "Fail");
                setPageState(result.failed === 0 ? "pass" : "fail");
            }
            catch (error) {
                log(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
                setStatus("Fail");
                setPageState("fail");
            }
            finally {
                runButton.disabled = false;
            }
        };
        runButton.addEventListener("click", () => void runAll());
        if (params.get("autorun") === "1") {
            void runAll();
        }
        else {
            logEl.textContent = `Press Run to execute all ${curve} smoke suites.`;
        }
        return;
    }
    const selected = SUITES.find((s) => s.curve === curve && s.id === suiteId);
    if (!selected) {
        logEl.textContent = `Unknown suite: ${curve}:${suiteId}`;
        return;
    }
    if (selected.kind === "bench") {
        benchControls.hidden = false;
        if (selected.defaultMinLog !== undefined) {
            getById("min-log").value = `${selected.defaultMinLog}`;
        }
        if (selected.defaultMaxLog !== undefined) {
            getById("max-log").value = `${selected.defaultMaxLog}`;
        }
        if (selected.defaultIters !== undefined) {
            getById("iters").value = `${selected.defaultIters}`;
        }
        // Bench page registers its own Run button listener on import
        await import(`${selected.script}`);
        return;
    }
    // Smoke suite: orchestrator owns the Run button
    const run = async () => {
        runButton.disabled = true;
        setStatus("Running");
        setPageState("running");
        const log = makeLogger(logEl);
        try {
            const module = await buildModule(curve, log);
            const mod = await import(selected.script);
            await mod.runSuite(module, log);
            setStatus("Pass");
            setPageState("pass");
        }
        catch (error) {
            log(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
            setStatus("Fail");
            setPageState("fail");
        }
        finally {
            runButton.disabled = false;
        }
    };
    runButton.addEventListener("click", () => void run());
    if (params.get("autorun") === "1") {
        void run();
    }
    else {
        logEl.textContent = `Press Run to execute the ${curve} ${selected.id} suite.`;
    }
}
void main();
