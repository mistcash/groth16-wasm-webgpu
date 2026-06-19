export type ScalarBatch = {
    hexes: string[];
    words: Uint32Array;
};
export type SparseSignedBucketMetadata = {
    baseIndices: Uint32Array;
    bucketPointers: Uint32Array;
    bucketSizes: Uint32Array;
    bucketValues: Uint32Array;
    windowStarts: Uint32Array;
    windowCounts: Uint32Array;
    numWindows: number;
    bucketCount: number;
};
export declare const INDEX_SIGN_BIT = 2147483648;
export declare function bestPippengerWindow(count: number): number;
export declare function hexesToScalarWords(hexes: readonly string[]): Uint32Array;
export declare function makeRandomScalarBatch(count: number, salt?: number): ScalarBatch;
export declare function buildSparseSignedBucketMetadataWords(scalarWords: Uint32Array, count: number, termsPerInstance: number, window: number, maxChunkSize?: number): SparseSignedBucketMetadata;
//# sourceMappingURL=msm_shared.d.ts.map