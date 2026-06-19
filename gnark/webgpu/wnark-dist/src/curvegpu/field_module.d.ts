import type { CurveGPUContext, FieldModule, SupportedCurveID } from "./api.js";
import type { SimpleKernel } from "./runtime_common.js";
export declare function createFieldModule(context: CurveGPUContext, curve: SupportedCurveID, field: "fr" | "fp", options: {
    byteSize: number;
    kernel: SimpleKernel;
    entryPoint: "fr_ops_main" | "fp_ops_main";
    label: string;
    shape: FieldModule["shape"];
}): FieldModule;
//# sourceMappingURL=field_module.d.ts.map