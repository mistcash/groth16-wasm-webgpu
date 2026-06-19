/**
 * Install a pre-built shader bundle so the library can operate without
 * making `fetch()` requests for WGSL files.
 *
 * Typically called automatically by importing the generated
 * `shader_bundle.generated.js` file (produced by `npm run build:shaders`).
 * When a bundle is installed, `fetchShaderText` reads from it and only falls
 * back to `fetch()` for paths not present in the bundle.
 */
export declare function setBundledShaders(bundle: Record<string, string>): void;
export declare function fetchShaderText(path: string): Promise<string>;
export declare function fetchShaderPart(spec: string): Promise<string>;
export declare function fetchShaderParts(parts: readonly string[]): Promise<string>;
//# sourceMappingURL=shaders.d.ts.map