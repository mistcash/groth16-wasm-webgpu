import type { CurveGPUContext, G1Module, G1MSMModule, G2Module, G2MSMModule, Groth16Module, Groth16QuotientModule, SupportedCurveID } from "./api.js";
type Groth16ModuleConfig = {
    context: CurveGPUContext;
    curve: SupportedCurveID;
    modulusHex: string;
    frBytes: number;
    quotient: Groth16QuotientModule;
    g1: G1Module;
    g2: G2Module;
    g1msm: G1MSMModule;
    g2msm: G2MSMModule;
};
export declare const defaultGroth16RuntimeURLs: Readonly<{
    wasmExecURL: string;
    webgpuWasmURL: string;
    nativeWasmURL: string;
}>;
export declare function createGroth16Module(config: Groth16ModuleConfig): Groth16Module;
export {};
//# sourceMappingURL=groth16_module.d.ts.map