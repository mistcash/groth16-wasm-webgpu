/**
 * Base class for all errors thrown by the curvegpu library.
 */
export declare class CurveGPUError extends Error {
    constructor(message: string);
}
/**
 * Thrown when WebGPU is not available in the current environment, or when
 * the adapter/device cannot be acquired.
 */
export declare class CurveGPUNotSupportedError extends CurveGPUError {
    constructor(message: string);
}
/**
 * Thrown when the GPU device is lost while an operation is in progress,
 * or exposed on the context so callers can subscribe to device-loss events.
 */
export declare class CurveGPUDeviceLostError extends CurveGPUError {
    constructor(message: string);
}
/**
 * Thrown when a shader file cannot be fetched or a required section is missing.
 */
export declare class CurveGPUShaderError extends CurveGPUError {
    constructor(message: string);
}
//# sourceMappingURL=errors.d.ts.map