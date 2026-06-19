import { buildSparseSignedBucketMetadataWords } from "./msm_shared.js";
import { type Kernel } from "./msm_gpu_runtime.js";
import type { BufferPool } from "./buffer_pool.js";
type SparseSignedBucketMetadata = ReturnType<typeof buildSparseSignedBucketMetadataWords>;
export type WindowReductionOptions = {
    device: GPUDevice;
    pool?: BufferPool;
    pointBytes: number;
    uniformBytes: number;
    zeroInput: GPUBuffer;
    bucketOutput: GPUBuffer;
    bucketCountOut: number;
    bucketValuesInput: GPUBuffer;
    windowStartsInput: GPUBuffer;
    windowCountsInput: GPUBuffer;
    metadata: SparseSignedBucketMetadata;
    count: number;
    labelPrefix: string;
};
export type WindowReductionResult = {
    windowOutput: GPUBuffer;
    cleanupBuffers: GPUBuffer[];
};
export type PippengerRuntime = {
    bucket: Kernel;
    bucketWorkgroupSize?: number;
    combine: Kernel;
    reduceWindows(options: WindowReductionOptions): Promise<WindowReductionResult>;
};
export declare function buildJacPippengerRuntime(kernels: {
    bucket: Kernel;
    weightJac: Kernel;
    subsumJac: Kernel;
    combine: Kernel;
}, workgroupSize?: number, debug?: boolean): PippengerRuntime;
export declare function runSparseSignedPippengerMSM(options: {
    device: GPUDevice;
    pool?: BufferPool;
    runtime: PippengerRuntime;
    basesBytes: Uint8Array;
    pointBytes: number;
    uniformBytes: number;
    zeroPointBytes: Uint8Array;
    scalarWords: Uint32Array;
    count: number;
    termsPerInstance: number;
    window: number;
    maxChunkSize?: number;
    labelPrefix: string;
    debug?: boolean;
}): Promise<Uint8Array>;
export {};
//# sourceMappingURL=msm_pippenger.d.ts.map