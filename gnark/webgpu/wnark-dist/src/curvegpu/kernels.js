import { shapeFor } from "./types.js";
import { fetchShaderText } from "./shaders.js";
export async function loadFieldKernel(curve, field) {
    const shaderPath = `/shaders/curves/${curve}/${field}_arith.wgsl`;
    await fetchShaderText(shaderPath);
    return {
        curve,
        field,
        shaderPath,
        shape: shapeFor(curve, field),
    };
}
