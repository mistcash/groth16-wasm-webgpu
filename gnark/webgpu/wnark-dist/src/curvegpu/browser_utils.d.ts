export declare function mustElement<T>(value: T | null, name: string): T;
export declare function createPageUI(statusEl: HTMLElement | null, logEl: HTMLElement | null): {
    setStatus: (text: string) => void;
    setPageState: (state: string) => void;
    writeLog: (lines: string[]) => void;
};
export declare function fetchText(path: string): Promise<string>;
export declare function fetchJSON<T>(path: string): Promise<T>;
export declare function fetchBytes(path: string): Promise<Uint8Array>;
export declare function getAdapterInfo(adapter: GPUAdapter): Promise<GPUAdapterInfo | null>;
export declare function appendAdapterDiagnostics(adapter: GPUAdapter, lines: string[]): Promise<void>;
export declare function hexToBytes(hex: string): Uint8Array;
export declare function bytesToHex(bytes: Uint8Array): string;
export declare function yieldToBrowser(): Promise<void>;
//# sourceMappingURL=browser_utils.d.ts.map