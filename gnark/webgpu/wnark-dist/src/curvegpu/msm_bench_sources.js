import { fetchBytes, fetchJSON } from "./browser_utils.js";
function slicePointByteFixture(fixture, pointBytes, count) {
    const byteLength = count * pointBytes;
    if (fixture.byteLength < byteLength) {
        throw new Error(`fixture has ${Math.floor(fixture.byteLength / pointBytes)} points, need ${count}`);
    }
    return fixture.slice(0, byteLength);
}
function isFetchFailure(error) {
    return error instanceof Error;
}
export function createPreferredByteBaseSource(options) {
    const params = new URLSearchParams(options.locationSearch);
    const explicitSourceRaw = params.get("base-source") ?? params.get("baseSource");
    const explicitSource = explicitSourceRaw === "fixture" || explicitSourceRaw === "generated" ? explicitSourceRaw : null;
    async function tryLoadFixture() {
        if (!options.fixtureJSONPath || !options.fixtureBinPath) {
            return null;
        }
        const start = performance.now();
        const [fixtureMeta, baseFixture] = await Promise.all([
            fetchJSON(options.fixtureJSONPath),
            fetchBytes(options.fixtureBinPath),
        ]);
        const fixtureLoadMs = performance.now() - start;
        if (fixtureMeta.point_bytes !== options.pointBytes) {
            throw new Error(`unexpected fixture point size: ${fixtureMeta.point_bytes}`);
        }
        if (baseFixture.byteLength !== fixtureMeta.count * fixtureMeta.point_bytes) {
            throw new Error(`fixture length mismatch: got ${baseFixture.byteLength}, want ${fixtureMeta.count * fixtureMeta.point_bytes}`);
        }
        return { fixtureMeta, baseFixture, fixtureLoadMs };
    }
    function missingFixtureMessage(size) {
        const noun = options.fixtureLabel ?? "base";
        const base = `no local ${noun} fixture is available`;
        if (!options.generateHint) {
            return base;
        }
        const hintSize = size > 0 ? size : 1 << 19;
        return `${base}; generate one with \`${options.generateHint(hintSize)}\``;
    }
    function smallFixtureMessage(pointCount, size) {
        const base = `fixture has ${pointCount} points, need ${size}`;
        if (!options.generateHint) {
            return base;
        }
        return `${base}; generate a larger one with \`${options.generateHint(size)}\``;
    }
    return {
        init: async () => {
            let fixtureMeta = null;
            let baseFixture = null;
            let fixtureLoadMs = null;
            if (explicitSource !== "generated") {
                try {
                    const loaded = await tryLoadFixture();
                    if (loaded) {
                        fixtureMeta = loaded.fixtureMeta;
                        baseFixture = loaded.baseFixture;
                        fixtureLoadMs = loaded.fixtureLoadMs;
                    }
                }
                catch (error) {
                    if (explicitSource === "fixture" || !isFetchFailure(error)) {
                        throw error;
                    }
                }
            }
            let baseSource;
            if (explicitSource === "fixture") {
                if (!baseFixture || !fixtureMeta) {
                    throw new Error(missingFixtureMessage(0));
                }
                baseSource = "fixture";
            }
            else if (explicitSource === "generated") {
                if (!options.generatedLoadBases) {
                    throw new Error("generated base source is not configured");
                }
                baseSource = "generated";
            }
            else if (baseFixture && fixtureMeta) {
                baseSource = "fixture";
            }
            else if (options.generatedLoadBases) {
                baseSource = "generated";
            }
            else {
                throw new Error(missingFixtureMessage(0));
            }
            const postMetricLines = [`base_source = ${baseSource}`];
            if (fixtureLoadMs !== null) {
                postMetricLines.push(`fixture_load_ms = ${fixtureLoadMs.toFixed(3)}`);
            }
            if (fixtureMeta) {
                postMetricLines.push(`fixture_points = ${fixtureMeta.count}`);
            }
            return {
                context: {
                    baseSource,
                    baseFixture,
                    fixtureMeta,
                },
                postMetricLines,
            };
        },
        loadBases: async ({ context, size }) => {
            const prepStart = performance.now();
            if (context.baseSource === "fixture") {
                if (!context.baseFixture || !context.fixtureMeta) {
                    throw new Error(missingFixtureMessage(size));
                }
                if (context.fixtureMeta.count < size) {
                    throw new Error(smallFixtureMessage(context.fixtureMeta.count, size));
                }
                return {
                    bases: slicePointByteFixture(context.baseFixture, options.pointBytes, size),
                    prepMs: performance.now() - prepStart,
                };
            }
            if (!options.generatedLoadBases) {
                throw new Error("generated base source is not configured");
            }
            return { bases: await options.generatedLoadBases(size), prepMs: performance.now() - prepStart };
        },
    };
}
