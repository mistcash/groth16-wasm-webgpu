import type { CurveGPUContext, FieldModule, G1Module, G1MSMModule, NTTModule, PlonkModule, SupportedCurveID } from "./api.js";
import type { PlonkQuotientModule } from "./plonk_quotient_module.js";
type PlonkModuleConfig = {
    context: CurveGPUContext;
    curve: SupportedCurveID;
    modulusHex: string;
    frBytes: number;
    fr: FieldModule;
    ntt: NTTModule;
    quotient: PlonkQuotientModule;
    g1: G1Module;
    g1msm: G1MSMModule;
};
export declare const defaultPlonkRuntimeURLs: Readonly<{
    wasmExecURL: string;
    webgpuWasmURL: string;
    nativeWasmURL: string;
}>;
export declare function createPlonkModule(config: PlonkModuleConfig): PlonkModule;
export {};
//# sourceMappingURL=plonk_module.d.ts.map