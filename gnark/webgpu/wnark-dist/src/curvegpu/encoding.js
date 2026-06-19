/**
 * Convert an unsigned numeric hex string into a fixed-width little-endian byte
 * string. The input may be odd-width and may include a `0x` prefix.
 */
export function hexToBytesLE(hex, byteSize) {
    const digits = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
    if (!/^[0-9a-fA-F]+$/.test(digits)) {
        throw new Error(`expected a non-empty hex string, got ${JSON.stringify(hex)}`);
    }
    if (digits.length > byteSize * 2) {
        throw new Error(`hex string is too wide for ${byteSize} bytes`);
    }
    const out = new Uint8Array(byteSize);
    let offset = 0;
    for (let end = digits.length; end > 0; end -= 2) {
        const start = Math.max(0, end - 2);
        out[offset] = Number.parseInt(digits.slice(start, end), 16);
        offset += 1;
    }
    return out;
}
