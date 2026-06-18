export function createSnarkjsInitializer({ inputUrl, wasmUrl, zkeyUrl, snarkjsUmdUrl }) {
	let appPromise;

	return async function initializeSnarkjs() {
		if (!appPromise) {
			appPromise = (async () => {
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

		return appPromise;
	};
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
