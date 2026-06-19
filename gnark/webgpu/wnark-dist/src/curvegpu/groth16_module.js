import { installGroth16WebGPUBridge } from "./groth16_webgpu_bridge.js";
export const defaultGroth16RuntimeURLs = Object.freeze({
    wasmExecURL: new URL("../../assets/wasm_exec.js", import.meta.url).toString(),
    webgpuWasmURL: new URL("../../assets/groth16-webgpu.wasm", import.meta.url).toString(),
    nativeWasmURL: new URL("../../assets/groth16-native.wasm", import.meta.url).toString(),
});
const runtimeGlobals = {
    webgpu: "wnarkGroth16RuntimeWebGPU",
    native: "wnarkGroth16RuntimeNative",
};
const loadedScripts = new Map();
const loadedRuntimes = new Map();
function cloneBytes(bytes) {
    return new Uint8Array(bytes);
}
function getGlobalObject(name) {
    return globalThis[name];
}
function setGlobalObject(name, value) {
    globalThis[name] = value;
}
function getGoConstructor() {
    const Go = getGlobalObject("Go");
    if (typeof Go !== "function") {
        throw new Error("Go WASM runtime is not available after loading wasm_exec.js");
    }
    return Go;
}
async function loadScript(url) {
    if (typeof document === "undefined") {
        throw new Error("Groth16 WASM runtime loading requires a browser document");
    }
    let promise = loadedScripts.get(url);
    if (!promise) {
        promise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = url;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`failed to load ${url}`));
            document.head.appendChild(script);
        });
        loadedScripts.set(url, promise);
    }
    await promise;
}
async function ensureWasmExec(url) {
    if (typeof getGlobalObject("Go") === "function") {
        return;
    }
    await loadScript(url);
}
async function waitForRuntimeGlobal(name) {
    const deadline = performance.now() + 10_000;
    while (performance.now() < deadline) {
        const runtime = getGlobalObject(name);
        if (runtime) {
            return runtime;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
    throw new Error(`Groth16 WASM runtime ${name} did not initialize`);
}
async function loadGoRuntime(kind, options, beforeStart) {
    const wasmURL = kind === "native" ? options.nativeWasmURL : options.webgpuWasmURL;
    const cacheKey = `${kind}\n${options.wasmExecURL}\n${wasmURL}`;
    let promise = loadedRuntimes.get(cacheKey);
    if (!promise) {
        promise = (async () => {
            beforeStart();
            await ensureWasmExec(options.wasmExecURL);
            const response = await fetch(wasmURL);
            if (!response.ok) {
                throw new Error(`failed to fetch ${wasmURL}: ${response.status}`);
            }
            const bytes = await response.arrayBuffer();
            const go = new (getGoConstructor())();
            const { instance } = await WebAssembly.instantiate(bytes, go.importObject);
            setGlobalObject(runtimeGlobals[kind], undefined);
            void go.run(instance).catch((error) => {
                console.error(`Groth16 ${kind} WASM runtime exited`, error);
            });
            return waitForRuntimeGlobal(runtimeGlobals[kind]);
        })();
        loadedRuntimes.set(cacheKey, promise);
    }
    else {
        beforeStart();
    }
    return promise;
}
function normalizeRuntimeOptions(options) {
    return {
        wasmExecURL: options?.wasmExecURL ?? defaultGroth16RuntimeURLs.wasmExecURL,
        webgpuWasmURL: options?.webgpuWasmURL ?? defaultGroth16RuntimeURLs.webgpuWasmURL,
        nativeWasmURL: options?.nativeWasmURL ?? defaultGroth16RuntimeURLs.nativeWasmURL,
    };
}
class RuntimeHandle {
    runtime;
    kind;
    curve;
    type;
    handle;
    #disposed = false;
    constructor(runtime, kind, curve, type, handle) {
        this.runtime = runtime;
        this.kind = kind;
        this.curve = curve;
        this.type = type;
        this.handle = handle;
    }
    async dispose() {
        if (this.#disposed) {
            return;
        }
        this.#disposed = true;
        await this.runtime.release(this.handle);
    }
    assertUsable(expectedType) {
        if (this.#disposed) {
            throw new Error(`Groth16 ${this.type} handle has been disposed`);
        }
        if (this.type !== expectedType) {
            throw new Error(`expected Groth16 ${expectedType} handle, got ${this.type}`);
        }
    }
}
class ConstraintSystemHandle extends RuntimeHandle {
    constraints;
    constructor(runtime, kind, curve, handle, constraints) {
        super(runtime, kind, curve, "ccs", handle);
        this.constraints = constraints;
    }
}
class ProvingKeyHandle extends RuntimeHandle {
    constructor(runtime, kind, curve, handle) {
        super(runtime, kind, curve, "pk", handle);
    }
}
class VerificationKeyHandle extends RuntimeHandle {
    constructor(runtime, kind, curve, handle) {
        super(runtime, kind, curve, "vk", handle);
    }
}
function runtimeHandle(handle, type) {
    if (!(handle instanceof RuntimeHandle)) {
        throw new Error("Groth16 handle was not created by this module");
    }
    handle.assertUsable(type);
    return handle;
}
function assertSameRuntime(a, b) {
    if (a.runtime !== b.runtime || a.kind !== b.kind) {
        throw new Error("Groth16 handles belong to different runtimes");
    }
    if (a.curve !== b.curve) {
        throw new Error(`Groth16 handles belong to different curves: ${a.curve} and ${b.curve}`);
    }
}
function writeUint32BE(out, offset, value) {
    out[offset] = (value >>> 24) & 0xff;
    out[offset + 1] = (value >>> 16) & 0xff;
    out[offset + 2] = (value >>> 8) & 0xff;
    out[offset + 3] = value & 0xff;
}
function writeBigIntBE(out, offset, byteSize, value) {
    let remaining = value;
    for (let i = byteSize - 1; i >= 0; i--) {
        out[offset + i] = Number(remaining & 0xffn);
        remaining >>= 8n;
    }
}
export function createGroth16Module(config) {
    const modulus = BigInt(config.modulusHex);
    let currentRuntime = null;
    let currentKind = "webgpu";
    function installBridge() {
        installGroth16WebGPUBridge({
            context: config.context,
            curve: config.curve,
            g1: config.g1,
            g2: config.g2,
            g1msm: config.g1msm,
            g2msm: config.g2msm,
            quotient: config.quotient,
        });
    }
    async function loadRuntime(options) {
        currentKind = options?.kind ?? "webgpu";
        const runtimeOptions = normalizeRuntimeOptions(options);
        currentRuntime = loadGoRuntime(currentKind, runtimeOptions, currentKind === "webgpu" ? installBridge : () => { });
        await currentRuntime;
    }
    async function getRuntime() {
        if (!currentRuntime) {
            await loadRuntime();
        }
        return { runtime: await currentRuntime, kind: currentKind };
    }
    return {
        context: config.context,
        curve: config.curve,
        computeGroth16QuotientPackedRegular(a, b, c) {
            return config.quotient.computeGroth16QuotientPackedRegular(a, b, c);
        },
        computeGroth16QuotientPackedMont(a, b, c) {
            return config.quotient.computeGroth16QuotientPackedMont(a, b, c);
        },
        prewarmGroth16QuotientDomain(size) {
            return config.quotient.prewarmGroth16QuotientDomain(size);
        },
        loadRuntime,
        async readConstraintSystem(bytes) {
            const { runtime, kind } = await getRuntime();
            const result = await runtime.readConstraintSystem(config.curve, cloneBytes(bytes));
            return new ConstraintSystemHandle(runtime, kind, config.curve, result.handle, result.constraints);
        },
        async readProvingKey(bytes, options) {
            const { runtime, kind } = await getRuntime();
            const result = await runtime.readProvingKey(config.curve, cloneBytes(bytes), options?.format ?? "serialized");
            return new ProvingKeyHandle(runtime, kind, config.curve, result.handle);
        },
        async readVerificationKey(bytes) {
            const { runtime, kind } = await getRuntime();
            const result = await runtime.readVerificationKey(config.curve, cloneBytes(bytes));
            return new VerificationKeyHandle(runtime, kind, config.curve, result.handle);
        },
        async prepareProvingKey(pk) {
            const pkHandle = runtimeHandle(pk, "pk");
            await pkHandle.runtime.prepareProvingKey(pkHandle.handle);
        },
        async prove(ccs, pk, witness) {
            const ccsHandle = runtimeHandle(ccs, "ccs");
            const pkHandle = runtimeHandle(pk, "pk");
            assertSameRuntime(ccsHandle, pkHandle);
            return ccsHandle.runtime.prove(ccsHandle.handle, pkHandle.handle, cloneBytes(witness));
        },
        async verify(proof, vk, publicWitness) {
            const vkHandle = runtimeHandle(vk, "vk");
            return vkHandle.runtime.verify(cloneBytes(proof), vkHandle.handle, cloneBytes(publicWitness));
        },
        encodeWitness(values, options) {
            if (!Number.isInteger(options.publicCount) || options.publicCount < 0 || options.publicCount > values.length) {
                throw new Error(`invalid publicCount ${options.publicCount}`);
            }
            const out = new Uint8Array(12 + values.length * config.frBytes);
            writeUint32BE(out, 0, options.publicCount);
            writeUint32BE(out, 4, values.length - options.publicCount);
            writeUint32BE(out, 8, values.length);
            for (let i = 0; i < values.length; i++) {
                const value = values[i];
                if (value < 0n || value >= modulus) {
                    throw new Error(`witness value at index ${i} is outside the scalar field`);
                }
                writeBigIntBE(out, 12 + i * config.frBytes, config.frBytes, value);
            }
            return out;
        },
    };
}
