import type { CurveGPUContext, FieldModule, G1Module, SupportedCurveID } from "./api.js";
import type { SimpleKernel } from "./runtime_common.js";
export declare function createG1Module(context: CurveGPUContext, options: {
    curve: SupportedCurveID;
    coordinateBytes: number;
    pointBytes: number;
    zeroHex: string;
    kernel: SimpleKernel;
}, fp: FieldModule): G1Module;
//# sourceMappingURL=g1_module.d.ts.map