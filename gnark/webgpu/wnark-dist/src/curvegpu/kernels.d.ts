import type { CurveID, FieldID, FieldShape } from "./types.js";
export interface KernelDescriptor {
    curve: CurveID;
    field: FieldID;
    shaderPath: string;
    shape: FieldShape;
}
export declare function loadFieldKernel(curve: CurveID, field: FieldID): Promise<KernelDescriptor>;
//# sourceMappingURL=kernels.d.ts.map