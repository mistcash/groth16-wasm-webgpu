export type Kernel = {
    pipeline: GPUComputePipeline;
    bindGroupLayout: GPUBindGroupLayout;
};
export declare function createMSMKernelSetAsync<T extends Record<string, string>>(device: GPUDevice, shaderCode: string, labelPrefix: string, entryPoints: T, debug?: boolean): Promise<{
    [K in keyof T]: Kernel;
}>;
export declare function createStorageBufferFromBytes(device: GPUDevice, label: string, bytes: Uint8Array, size: number): GPUBuffer;
export declare function createU32StorageBuffer(device: GPUDevice, label: string, values: Uint32Array): GPUBuffer;
export declare function createEmptyPointStorageBuffer(device: GPUDevice, label: string, count: number, pointBytes: number): GPUBuffer;
export declare function createParamsBuffer(device: GPUDevice, label: string, uniformBytes: number, values: {
    count: number;
    opcode?: number;
    termsPerInstance?: number;
    window?: number;
    numWindows?: number;
    bucketCount?: number;
    rowWidth?: number;
}): GPUBuffer;
export declare function createBindGroupForBuffers(device: GPUDevice, kernel: Kernel, label: string, inputA: GPUBuffer, inputB: GPUBuffer, output: GPUBuffer, params: GPUBuffer, meta0?: GPUBuffer, meta1?: GPUBuffer, meta2?: GPUBuffer): GPUBindGroup;
export declare function submitKernel(device: GPUDevice, kernel: Kernel, bindGroup: GPUBindGroup, count: number, label: string, workgroupSize?: number, debug?: boolean): Promise<void>;
export declare function readbackBuffer(device: GPUDevice, buffer: GPUBuffer, size: number): Promise<Uint8Array>;
//# sourceMappingURL=msm_gpu_runtime.d.ts.map