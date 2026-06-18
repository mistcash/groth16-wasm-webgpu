import initArk, {
	run_browser_proof as runArkworksProof,
	run_browser_setup as runArkworksSetup,
} from "./arkworks/web/pkg/zk_bench_arkworks.js";

const arkworksButton = document.querySelector("#run-arkworks");
const snarkjsButton = document.querySelector("#run-snarkjs");
const output = document.querySelector("#output");

const wasmUrl = new URL("./snarkjs/build/circuit_js/circuit.wasm", import.meta.url).href;
const zkeyUrl = new URL("./snarkjs/build/circuit_final.zkey", import.meta.url).href;
const inputUrl = new URL("./snarkjs/input.json", import.meta.url).href;
const snarkjsUmdUrl = new URL("./snarkjs/node_modules/snarkjs/build/snarkjs.min.js", import.meta.url).href;

const state = {
	busy: false,
	arkworks: {
		phase: "setup",
		initialized: false,
	},
	snarkjs: {
		phase: "setup",
		appPromise: null,
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
}

function updateButtons() {
	arkworksButton.disabled = state.busy;
	snarkjsButton.disabled = state.busy;
	setButtonLabels();
}

async function fetchJson(url) {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
	}
	return response.json();
}

function loadScript(url) {
	return new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = url;
		script.async = true;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error(`Failed to load ${url}`));
		document.head.appendChild(script);
	});
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

async function initializeSnarkjs() {
	if (!state.snarkjs.appPromise) {
		state.snarkjs.appPromise = (async () => {
			const inputJson = await fetchJson(inputUrl);
			if (!globalThis.snarkjs) {
				await loadScript(snarkjsUmdUrl);
			}
			if (!globalThis.snarkjs?.groth16) {
				throw new Error("snarkjs browser bundle did not expose groth16.");
			}
			await Promise.all([fetch(wasmUrl), fetch(zkeyUrl)]);
			return { groth16: globalThis.snarkjs.groth16, inputJson };
		})();
	}

	return state.snarkjs.appPromise;
}

async function runArkworksAction() {
	if (state.arkworks.phase === "setup") {
		appendLog("[arkworks] Running setup...");
		await ensureArkworksInitialized();
		const setupResult = runArkworksSetup();
		appendLog(setupResult);
		appendLog("[arkworks] Setup complete.");
		state.arkworks.phase = "benchmark";
		return;
	}

	appendLog("[arkworks] Running benchmark...");
	const proofResult = runArkworksProof();
	appendLog(proofResult);
	appendLog("[arkworks] Benchmark complete.");
}

async function runSnarkjsAction() {
	if (state.snarkjs.phase === "setup") {
		appendLog("[snarkjs] Running setup...");
		await initializeSnarkjs();
		appendLog("[snarkjs] Setup complete.");
		state.snarkjs.phase = "benchmark";
		return;
	}

	appendLog("[snarkjs] Running benchmark...");
	const { groth16, inputJson } = await initializeSnarkjs();
	const start = performance.now();
	const result = await groth16.fullProve(inputJson, wasmUrl, zkeyUrl);
	const elapsed = performance.now() - start;

	appendLog(`snarkjs_proof_ms=${elapsed.toFixed(2)}`);
	appendLog(`snarkjs_public_signals=${result.publicSignals.length}`);
	appendLog(`snarkjs_proof_pi_a=${JSON.stringify(result.proof.pi_a)}`);
	appendLog("[snarkjs] Benchmark complete.");
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

appendLog("Ready. Use each button to run setup first, then benchmark.");
updateButtons();
