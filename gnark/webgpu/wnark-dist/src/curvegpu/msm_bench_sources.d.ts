export type BaseLoadResult<TBases> = {
    bases: TBases;
    prepMs: number;
};
export type BaseSourceInitResult<TContext> = {
    context: TContext;
    postMetricLines?: string[];
};
export type BaseSourceProvider<TBases, TContext> = {
    init: () => Promise<BaseSourceInitResult<TContext>>;
    loadBases: (args: {
        context: TContext;
        size: number;
    }) => Promise<BaseLoadResult<TBases>>;
};
export type FixtureMetadata = {
    count: number;
    point_bytes: number;
    format: string;
};
export type PreferredByteBaseSource = "fixture" | "generated";
export type PreferredByteBaseSourceContext = {
    baseSource: PreferredByteBaseSource;
    baseFixture: Uint8Array | null;
    fixtureMeta: FixtureMetadata | null;
};
export declare function createPreferredByteBaseSource(options: {
    locationSearch: string;
    pointBytes: number;
    fixtureJSONPath?: string;
    fixtureBinPath?: string;
    generatedLoadBases?: (size: number) => Promise<Uint8Array>;
    generateHint?: (size: number) => string;
    fixtureLabel?: string;
}): BaseSourceProvider<Uint8Array, PreferredByteBaseSourceContext>;
//# sourceMappingURL=msm_bench_sources.d.ts.map