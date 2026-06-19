export declare function benchmarkTotalDuration(iters: number, run: () => Promise<void>, yieldBetween?: () => Promise<void>): Promise<{
    coldMs: number;
    warmMs: number;
}>;
//# sourceMappingURL=bench_total.d.ts.map