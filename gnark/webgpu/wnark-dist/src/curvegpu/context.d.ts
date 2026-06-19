import type { CurveGPUContext, CurveGPUContextOptions } from "./api.js";
/**
 * Create the shared browser WebGPU context for the library.
 *
 * The context owns adapter and device acquisition. It is intended to be
 * created once and reused across field, group, NTT, and MSM operations.
 */
export declare function createCurveGPUContext(options?: CurveGPUContextOptions): Promise<CurveGPUContext>;
//# sourceMappingURL=context.d.ts.map