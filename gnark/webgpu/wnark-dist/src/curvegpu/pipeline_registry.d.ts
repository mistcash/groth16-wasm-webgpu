import type { Kernel } from "./msm_gpu_runtime.js";
import type { SimpleKernel } from "./runtime_common.js";
export interface PipelineRegistry {
    getOpsKernel(entryPoint: string): SimpleKernel;
    getMSMKernel(entryPoint: string): Kernel;
}
export type OpsShaderSpec = {
    shaderParts: readonly string[];
    entryPoint: string;
    /** Pass WORKGROUP_SIZE override constant at pipeline creation time. Only valid for shaders that declare `override WORKGROUP_SIZE`. */
    useWorkgroupOverride?: boolean;
};
export type MSMShaderSpec = {
    shaderParts: readonly string[];
    entryPoints: readonly string[];
};
export declare function buildPipelineRegistry(options: {
    device: GPUDevice;
    opsShaders: OpsShaderSpec[];
    msmShaders: MSMShaderSpec[];
    /** Workgroup size to use for ops kernels that declare `override WORKGROUP_SIZE`. Defaults to 64. */
    opsWorkgroupSize?: number;
    debug?: boolean;
}): Promise<PipelineRegistry>;
//# sourceMappingURL=pipeline_registry.d.ts.map