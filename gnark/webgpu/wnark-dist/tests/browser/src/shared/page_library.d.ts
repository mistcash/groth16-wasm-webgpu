import { type CurveGPUContext, type CurveModule, type SupportedCurveID } from "../../../../src/index.js";
export declare function getRequestedCurveId(search?: string): SupportedCurveID;
export declare function curveDisplayName(curve: SupportedCurveID): string;
export declare function appendContextDiagnostics(lines: string[], context: CurveGPUContext): void;
export declare function createRequestedCurveModule(curve?: SupportedCurveID): Promise<CurveModule>;
//# sourceMappingURL=page_library.d.ts.map