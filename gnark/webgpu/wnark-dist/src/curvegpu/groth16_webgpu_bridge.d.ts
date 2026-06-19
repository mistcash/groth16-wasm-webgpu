import type { CurveGPUContext, G1Module, G1MSMModule, G2Module, G2MSMModule, Groth16QuotientModule, SupportedCurveID } from "./api.js";
type BridgeDependencies = {
    context: CurveGPUContext;
    curve: SupportedCurveID;
    g1: G1Module;
    g2: G2Module;
    g1msm: G1MSMModule;
    g2msm: G2MSMModule;
    quotient: Groth16QuotientModule;
};
export declare function installGroth16WebGPUBridge(dependencies: BridgeDependencies): void;
export {};
//# sourceMappingURL=groth16_webgpu_bridge.d.ts.map