import type { BufferPool } from "./buffer_pool.js";
export type SimpleKernel = {
    pipeline: GPUComputePipeline;
    bindGroupLayout: GPUBindGroupLayout;
    workgroupSize: number;
};
export declare function lazyAsync<T>(factory: () => Promise<T>): () => Promise<T>;
export declare function cloneBytes(bytes: Uint8Array): Uint8Array;
export declare function ensureByteLength(bytes: Uint8Array, expected: number, label: string): void;
export declare function packElementBatch(values: readonly Uint8Array[], elementBytes: number, label: string): Uint8Array;
export declare function unpackElementBatch(bytes: Uint8Array, elementBytes: number, count: number): Uint8Array[];
export declare function loadShaderText(path: string): Promise<string>;
export declare function loadShaderParts(parts: readonly string[]): Promise<string>;
export declare function createSimpleStorageBuffer(device: GPUDevice, label: string, size: number, usage?: GPUBufferUsageFlags): GPUBuffer;
export declare function createSimpleStorageBufferFromBytes(device: GPUDevice, label: string, bytes: Uint8Array, usage?: GPUBufferUsageFlags): GPUBuffer;
export declare function createSimpleUniformBuffer(device: GPUDevice, label: string, uniformWords: Uint32Array): GPUBuffer;
export declare function createSimpleBindGroup(device: GPUDevice, kernel: SimpleKernel, label: string, inputA: GPUBuffer, inputB: GPUBuffer, output: GPUBuffer, uniform: GPUBuffer): GPUBindGroup;
export declare function submitSimpleKernel(device: GPUDevice, kernel: SimpleKernel, bindGroup: GPUBindGroup, workgroups: number, label: string): Promise<void>;
export declare function readbackSimpleBuffer(device: GPUDevice, buffer: GPUBuffer, outputBytes: number, label: string): Promise<Uint8Array>;
export declare function runSimpleKernel(options: {
    device: GPUDevice;
    pool?: BufferPool;
    kernel: SimpleKernel;
    label: string;
    inputA: Uint8Array;
    inputB: Uint8Array;
    outputBytes: number;
    uniformWords: Uint32Array;
    workgroups: number;
}): Promise<Uint8Array>;
//# sourceMappingURL=runtime_common.d.ts.map