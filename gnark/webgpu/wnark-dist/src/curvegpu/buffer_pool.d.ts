/**
 * Per-device GPU buffer pool. Caches released buffers keyed by
 * (rounded-size, usage) and re-issues them on acquire, avoiding
 * repeated GPU allocations on hot paths.
 *
 * Sizes are rounded up to the next power of two to reduce fragmentation.
 * Total pooled memory is capped at `maxPooledBytes` (default 64 MB).
 * Buffers that would exceed the cap are destroyed rather than pooled.
 */
export declare class BufferPool {
    private readonly device;
    private readonly maxBytes;
    private readonly pool;
    private readonly meta;
    private totalBytes;
    constructor(device: GPUDevice, options?: {
        maxPooledBytes?: number;
    });
    /**
     * Return a buffer of at least `size` bytes with the given `usage`.
     * May return a cached buffer from a previous `release` call.
     */
    acquire(size: number, usage: number, label?: string): GPUBuffer;
    /**
     * Return a buffer to the pool. If the pool is at capacity, the buffer
     * is destroyed instead. Do not use the buffer after calling `release`.
     */
    release(buffer: GPUBuffer): void;
    /**
     * Destroy all pooled buffers and clear the pool. Call when the context
     * is closed to avoid GPU memory leaks.
     */
    destroy(): void;
}
//# sourceMappingURL=buffer_pool.d.ts.map