import initArk, {
	run_browser_proof as runArkworksProof,
	run_browser_setup as runArkworksSetup,
} from "./arkworks/web/pkg/zk_bench_arkworks.js";
import { createSnarkjsInitializer } from "./snarkjs/web/snarkjs-browser.js";

const arkworksButton = document.querySelector("#run-arkworks");
const snarkjsButton = document.querySelector("#run-snarkjs");
const gnarkButton = document.querySelector("#run-gnark");
const output = document.querySelector("#output");

const wasmUrl = new URL("./snarkjs/build/circuit_js/circuit.wasm", import.meta.url).href;
const zkeyUrl = new URL("./snarkjs/build/circuit_final.zkey", import.meta.url).href;
const inputUrl = new URL("./snarkjs/input.json", import.meta.url).href;
const snarkjsUmdUrl = new URL("./snarkjs/node_modules/snarkjs/build/snarkjs.min.js", import.meta.url).href;
const initializeSnarkjs = createSnarkjsInitializer({ inputUrl, wasmUrl, zkeyUrl, snarkjsUmdUrl });

const gnarkWasmUrl = new URL("./gnark/web/main.wasm", import.meta.url).href;
const gnarkAssignmentUrl = new URL("./gnark/web/assignment.json", import.meta.url).href;

const state = {
	busy: false,
	arkworks: {
		phase: "setup",
		initialized: false,
	},
	snarkjs: {
		phase: "setup",
	},
	gnark: {
		phase: "setup",
		initialized: false,
	},
};

function appendLog(message) {
	output.textContent += `${message}\n`;
	output.scrollTop = output.scrollHeight;
}

function setButtonLabels() {
	arkworksButton.textContent =
		state.arkworks.phase === "setup" ? "Run Arkworks setup" : "Run Arkworks benchmark";
	snarkjsButton.textContent =
		state.snarkjs.phase === "setup" ? "Run snarkjs setup" : "Run snarkjs benchmark";
	gnarkButton.textContent =
		state.gnark.phase === "setup" ? "Run Gnark setup" : "Run Gnark benchmark";
}

function updateButtons() {
	arkworksButton.disabled = state.busy;
	snarkjsButton.disabled = state.busy;
	gnarkButton.disabled = state.busy;
	setButtonLabels();
}

async function ensureArkworksInitialized() {
	if (state.arkworks.initialized) {
		return;
	}
	appendLog("[arkworks] Loading wasm module...");
	await initArk();
	state.arkworks.initialized = true;
	appendLog("[arkworks] Wasm module loaded.");
}

async function runArkworksAction() {
	if (state.arkworks.phase === "setup") {
		appendLog("[arkworks] Running setup...");
		const startRun = performance.now();
		await ensureArkworksInitialized();
		const setupResult = runArkworksSetup();
		appendLog(setupResult);
		const runTime = performance.now() - startRun;
		appendLog(`\n[BENCH] arkworks_setup_ms=${runTime.toFixed(2)}\n`);
		appendLog("[arkworks] Setup complete.");
		state.arkworks.phase = "benchmark";
		return;
	}

	appendLog("[arkworks] Running WASM benchmark...");
	const proofResult = await new Promise(resolve => {
		setTimeout(() => { resolve(runArkworksProof()) }, 1);
	});
	appendLog(proofResult);
	appendLog("[arkworks] Benchmark complete.");
}

async function runSnarkjsAction() {
	if (state.snarkjs.phase === "setup") {
		appendLog("[snarkjs] Running setup...");
		const startRun = performance.now();
		await initializeSnarkjs();
		const runTime = performance.now() - startRun;
		appendLog(`\n[BENCH] snarkjs_setup_ms=${runTime.toFixed(2)}\n`);
		appendLog("[snarkjs] Setup complete.");
		state.snarkjs.phase = "benchmark";
		return;
	}

	appendLog("[snarkjs] Running WASM benchmark...");
	const { groth16, inputJson } = await initializeSnarkjs();
	const start = performance.now();
	const result = await groth16.fullProve(inputJson, wasmUrl, zkeyUrl);
	const elapsed = performance.now() - start;

	appendLog(`\n[BENCH] snarkjs_prover_ms=${elapsed.toFixed(2)}\n`);
	appendLog(`snarkjs_public_signals=${result.publicSignals.length}`);
	appendLog(`snarkjs_proof_pi_a=${JSON.stringify(result.proof.pi_a)}`);
	appendLog("[snarkjs] Benchmark complete.");
}

async function runGnarkAction() {
	if (state.gnark.phase === "setup") {
		appendLog("[gnark] Running setup...");
		const startRun = performance.now();
		const go = new Go();
		const result = await WebAssembly.instantiateStreaming(
			fetch(gnarkWasmUrl),
			go.importObject
		);
		go.run(result.instance);
		const runTime = performance.now() - startRun;

		appendLog(`\n[BENCH] gnark_setup_ms=${runTime.toFixed(2)}\n`);

		// Test if functions are available
		if (typeof prove !== 'undefined') {
			appendLog('✓ prove function available');
			appendLog("[gnark] Setup complete.");
			state.gnark.phase = "benchmark";
			// Call your exported functions here
		} else {
			appendLog('⚠ prove function not found');
			appendLog("[gnark] X Setup failed.");
		}
		return;
	}

	appendLog("[gnark] Running WASM benchmark...");
	const assignment = await (await fetch(gnarkAssignmentUrl)).json();
	const start = performance.now();
	const proof = globalThis.prove(JSON.stringify(assignment));
	// const proof = JSON.parse(proofStr);
	const elapsed = performance.now() - start;

	appendLog(``);
	appendLog(`[BENCH] gnark_prover_ms=${elapsed.toFixed(2)}`);
	appendLog(``);
	if (proof.status === 'success') {
		appendLog(`gnark_proof_status=${proof.status}`);
		appendLog(`gnark_proof_size=${JSON.stringify(proof.proof).length}`);
	} else {
		appendLog(`gnark_proof_status=${proof.status || 'unknown'}`);
	}
	appendLog("[gnark] Benchmark complete.");
}

async function runAction(label, fn) {
	state.busy = true;
	updateButtons();

	try {
		await fn();
	} catch (error) {
		appendLog(`[${label}] Error: ${String(error)}`);
	} finally {
		state.busy = false;
		updateButtons();
	}
}

arkworksButton.addEventListener("click", async () => {
	await runAction("arkworks", runArkworksAction);
});

snarkjsButton.addEventListener("click", async () => {
	await runAction("snarkjs", runSnarkjsAction);
});

gnarkButton.addEventListener("click", async () => {
	await runAction("gnark", runGnarkAction);
});

appendLog("Ready. Use each button to run setup first, then benchmark.");
updateButtons();
