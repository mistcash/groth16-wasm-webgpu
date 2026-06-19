import type { CurveGPUContext, FieldModule, G2Module, SupportedCurveID } from "./api.js";
import type { SimpleKernel } from "./runtime_common.js";
export declare function createG2Module(context: CurveGPUContext, options: {
    curve: SupportedCurveID;
    componentBytes: number;
    coordinateBytes: number;
    pointBytes: number;
    kernel: SimpleKernel;
}, fp: FieldModule): G2Module;
//# sourceMappingURL=g2_module.d.ts.map