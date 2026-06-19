import type { CurveGPUContext, FieldModule, G1Module, G1MSMModule, NTTModule, SupportedCurveID } from "./api.js";
import type { PlonkQuotientModule } from "./plonk_quotient_module.js";
type BridgeDependencies = {
    context: CurveGPUContext;
    curve: SupportedCurveID;
    fr: FieldModule;
    ntt: NTTModule;
    g1: G1Module;
    g1msm: G1MSMModule;
    quotient: PlonkQuotientModule;
};
export declare function installPlonkWebGPUBridge(dependencies: BridgeDependencies): void;
export {};
//# sourceMappingURL=plonk_webgpu_bridge.d.ts.map