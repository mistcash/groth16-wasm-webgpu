import type { CurveModule, CurveGPUContext, SupportedCurveID } from "./api.js";
/**
 * Runtime metadata for a supported curve.
 *
 * This is kept separate from the page harnesses so the library can evolve
 * around one shared source of curve-specific facts.
 */
export interface CurveDefinition {
    readonly id: SupportedCurveID;
    readonly frArithShaderPath: string;
    readonly frVectorShaderPath: string;
    readonly frNTTShaderPath: string;
    readonly frNTTDomainPath?: string;
    readonly frModulusHex?: string;
    readonly fpArithShaderPath: string;
    readonly g1ArithShaderParts: readonly string[];
    readonly g1MSMShaderParts: readonly string[];
    readonly g2ArithShaderParts: readonly string[];
    readonly g2MSMShaderParts: readonly string[];
    readonly coordinateBytes: number;
    readonly pointBytes: number;
    readonly g2CoordinateBytes: number;
    readonly g2PointBytes: number;
    readonly zeroHex: string;
}
/**
 * Ordered list of curves currently exposed by the browser library.
 */
export declare const supportedCurveIds: readonly SupportedCurveID[];
/**
 * Return the runtime metadata for a supported curve.
 */
export declare function curveDefinition(curve: SupportedCurveID): CurveDefinition;
/**
 * Create the high-level curve module for a supported curve.
 *
 * This establishes the stable public object shape that later steps populate
 * with concrete field, NTT, group, and MSM operations.
 */
export declare function createCurveModule(context: CurveGPUContext, curve: SupportedCurveID): Promise<CurveModule>;
/**
 * Create the BN254 module bound to an existing context.
 */
export declare function createBN254(context: CurveGPUContext): Promise<CurveModule>;
/**
 * Create the BLS12-381 module bound to an existing context.
 */
export declare function createBLS12381(context: CurveGPUContext): Promise<CurveModule>;
/**
 * Create the BLS12-377 module bound to an existing context.
 */
export declare function createBLS12377(context: CurveGPUContext): Promise<CurveModule>;
//# sourceMappingURL=curves.d.ts.map