/**
 * Documentation aliases for the byte encodings used at the WebGPU boundary.
 *
 * These are intentionally plain Uint8Array aliases, not branded types: the
 * runtime representation stays simple while function names carry the encoding.
 */
export type RegularLEBytes = Uint8Array;
export type MontgomeryLEBytes = Uint8Array;
export type PackedRegularLEBytes = Uint8Array;
export type PackedMontgomeryLEBytes = Uint8Array;
/**
 * Convert an unsigned numeric hex string into a fixed-width little-endian byte
 * string. The input may be odd-width and may include a `0x` prefix.
 */
export declare function hexToBytesLE(hex: string, byteSize: number): RegularLEBytes;
//# sourceMappingURL=encoding.d.ts.map