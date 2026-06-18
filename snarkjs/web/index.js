import { createSnarkjsInitializer } from "./snarkjs-browser.js";

const setupButton = document.querySelector("#setup-snarkjs");
const proveButton = document.querySelector("#prove-snarkjs");
const status = document.querySelector("#status-snarkjs");
const output = document.querySelector("#output-snarkjs");

const wasmUrl = new URL("../build/circuit_js/circuit.wasm", import.meta.url).href;
const zkeyUrl = new URL("../build/circuit_final.zkey", import.meta.url).href;
const inputUrl = new URL("../input.json", import.meta.url).href;
const snarkjsUmdUrl = new URL("../node_modules/snarkjs/build/snarkjs.min.js", import.meta.url).href;
const initialize = createSnarkjsInitializer({ inputUrl, wasmUrl, zkeyUrl, snarkjsUmdUrl });

function setStatus(message) {
	status.textContent = message;
}

function setOutput(text) {
	output.textContent = text;
}

setupButton.addEventListener("click", async () => {
	setupButton.disabled = true;
	try {
		await initialize();
		proveButton.disabled = false;
		setStatus("Setup complete.");
		setOutput("Ready.");
	} catch (error) {
		setStatus("Setup failed.");
		setOutput(String(error));
	} finally {
		setupButton.disabled = false;
	}
});

proveButton.addEventListener("click", async () => {
	proveButton.disabled = true;

	try {
		const { groth16, inputJson } = await initialize();
		setStatus("Timing proof generation...");

		const start = performance.now();
		const result = await groth16.fullProve(inputJson, wasmUrl, zkeyUrl);
		const elapsed = performance.now() - start;

		setStatus("Proof generation complete.");
		setOutput([
			`snarkjs_proof_ms=${elapsed.toFixed(2)}`,
			`snarkjs_public_signals=${result.publicSignals.length}`,
			`snarkjs_proof_pi_a=${JSON.stringify(result.proof.pi_a)}`,
		].join("\n"));
	} catch (error) {
		setStatus("Proof generation failed.");
		setOutput(String(error));
	} finally {
		proveButton.disabled = false;
	}
});