import type { CurveGPUContext, FieldModule, G1Module, G1MSMModule, SupportedCurveID } from "./api.js";
import type { PippengerRuntime } from "./msm_pippenger.js";
export declare function createG1MSMModule(context: CurveGPUContext, options: {
    curve: SupportedCurveID;
    coordinateBytes: number;
    pointBytes: number;
    runtime: PippengerRuntime;
}, fp: FieldModule, g1: G1Module): G1MSMModule;
//# sourceMappingURL=msm_module.d.ts.map