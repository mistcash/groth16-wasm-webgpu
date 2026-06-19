import type { CurveGPUContext, FieldModule, G2Module, G2MSMModule, SupportedCurveID } from "./api.js";
import { type PippengerRuntime } from "./msm_pippenger.js";
export declare function createG2MSMModule(context: CurveGPUContext, options: {
    curve: SupportedCurveID;
    componentBytes: number;
    pointBytes: number;
    runtime: PippengerRuntime;
}, g2: G2Module, fp: FieldModule): G2MSMModule;
//# sourceMappingURL=g2_msm_module.d.ts.map