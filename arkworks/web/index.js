import init, { run_browser_proof, run_browser_setup } from "./pkg/zk_bench_arkworks.js";

const setupButton = document.querySelector("#setup-arkworks");
const proveButton = document.querySelector("#prove-arkworks");
const output = document.querySelector("#output-arkworks");

async function boot() {
	try {
		output.textContent = "Loading wasm module...";
		await init();
		output.textContent = "Ready.";
		setupButton.disabled = false;
	} catch (error) {
		output.textContent = `Failed to initialize wasm module.\n\n${error}`;
	}
}

setupButton.disabled = true;
proveButton.disabled = true;

setupButton.addEventListener("click", async () => {
	setupButton.disabled = true;
	proveButton.disabled = true;
	output.textContent = "Running setup...";

	try {
		const result = run_browser_setup();
		output.textContent = `${result}\n\nSetup complete.`;
		proveButton.disabled = false;
	} catch (error) {
		output.textContent = `Setup failed.\n\n${error}`;
	} finally {
		setupButton.disabled = false;
	}
});

proveButton.addEventListener("click", async () => {
	setupButton.disabled = true;
	proveButton.disabled = true;
	output.textContent = "Timing proof generation...";

	try {
		const result = run_browser_proof();
		output.textContent = `${result}\n\nProof timing complete.`;
	} catch (error) {
		output.textContent = `Proof generation failed.\n\n${error}`;
	} finally {
		setupButton.disabled = false;
		proveButton.disabled = false;
	}
});

boot();