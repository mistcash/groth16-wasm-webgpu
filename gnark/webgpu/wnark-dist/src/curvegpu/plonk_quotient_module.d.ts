import type { CurveGPUContext, FieldModule, NTTModule, SupportedCurveID } from "./api.js";
export type PlonkTransformAndEvaluateQuotientCosetInput = {
    dynamicValuesPacked: Uint8Array;
    scalingPacked: Uint8Array;
    staticValuesPacked: Uint8Array;
    twiddlesPacked: Uint8Array;
    denominatorsPacked: Uint8Array;
    blindsPacked: Uint8Array;
    scalarsPacked: Uint8Array;
    elementCount: number;
    blindCoeffCount: number;
    commitmentCount: number;
    dynamicTransformCacheKey?: number;
    staticMontCacheKey?: number;
};
export type PlonkTransformAndEvaluateQuotientCosetsInput = PlonkTransformAndEvaluateQuotientCosetInput & {
    staticMontCacheKeysPacked: Uint8Array;
    cosetCount: number;
    auxMontCacheKey?: number;
};
export type PlonkPreloadQuotientStaticAndAuxInput = {
    staticValuesPacked: Uint8Array;
    staticMontCacheKeysPacked: Uint8Array;
    scalingPacked: Uint8Array;
    twiddlesPacked: Uint8Array;
    denominatorsPacked: Uint8Array;
    elementCount: number;
    staticVectorCount: number;
    cosetCount: number;
    auxMontCacheKey: number;
};
export type PlonkQuotientModule = {
    readonly context: CurveGPUContext;
    readonly curve: SupportedCurveID;
    transformAndEvaluateQuotientCoset(input: PlonkTransformAndEvaluateQuotientCosetInput): Promise<Uint8Array>;
    transformAndEvaluateQuotientCosets(input: PlonkTransformAndEvaluateQuotientCosetsInput): Promise<Uint8Array>;
    preloadQuotientStaticAndAux(input: PlonkPreloadQuotientStaticAndAuxInput): Promise<void>;
    prewarmPlonkQuotientEvaluateKernel(commitmentCount?: number): Promise<void>;
};
export declare function createPlonkQuotientModule(config: {
    context: CurveGPUContext;
    curve: SupportedCurveID;
    fr: FieldModule;
    ntt: NTTModule;
}): PlonkQuotientModule;
//# sourceMappingURL=plonk_quotient_module.d.ts.map