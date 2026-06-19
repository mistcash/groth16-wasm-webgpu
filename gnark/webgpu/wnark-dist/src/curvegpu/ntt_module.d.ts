import type { CurveGPUContext, FieldModule, Groth16QuotientModule, NTTModule, SupportedCurveID } from "./api.js";
import type { SimpleKernel } from "./runtime_common.js";
export declare function createNTTModule(context: CurveGPUContext, options: {
    curve: SupportedCurveID;
    vectorKernel: SimpleKernel;
    fieldKernel: SimpleKernel;
    nttKernel: SimpleKernel;
    domainPath: string;
    modulusHex: string;
}, fr: FieldModule): NTTModule & Groth16QuotientModule;
//# sourceMappingURL=ntt_module.d.ts.map