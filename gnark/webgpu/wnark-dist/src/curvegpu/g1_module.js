import { cloneBytes, ensureByteLength, lazyAsync, runSimpleKernel, } from "./runtime_common.js";
const OP_COPY = 0;
const OP_JAC_INFINITY = 1;
const OP_AFFINE_TO_JAC = 2;
const OP_NEG_JAC = 3;
const OP_DOUBLE_JAC = 4;
const OP_ADD_MIXED = 5;
const OP_JAC_TO_AFFINE = 6;
const OP_AFFINE_ADD = 7;
function zeroBytes(size) {
    return new Uint8Array(size);
}
function clonePoint(point) {
    return { x: cloneBytes(point.x), y: cloneBytes(point.y), z: cloneBytes(point.z) };
}
function cloneAffine(point) {
    return { x: cloneBytes(point.x), y: cloneBytes(point.y) };
}
function packJacobianPoints(points, coordinateBytes, pointBytes, label) {
    const out = new Uint8Array(points.length * pointBytes);
    points.forEach((point, index) => {
        ensureByteLength(point.x, coordinateBytes, `${label}[${index}].x`);
        ensureByteLength(point.y, coordinateBytes, `${label}[${index}].y`);
        ensureByteLength(point.z, coordinateBytes, `${label}[${index}].z`);
        const base = index * pointBytes;
        out.set(point.x, base);
        out.set(point.y, base + coordinateBytes);
        out.set(point.z, base + 2 * coordinateBytes);
    });
    return out;
}
function packAffinePoints(points, coordinateBytes, pointBytes, oneMontZ, zeroCoordinate, label) {
    const out = new Uint8Array(points.length * pointBytes);
    points.forEach((point, index) => {
        ensureByteLength(point.x, coordinateBytes, `${label}[${index}].x`);
        ensureByteLength(point.y, coordinateBytes, `${label}[${index}].y`);
        const isInfinity = point.x.every((byte) => byte === 0) && point.y.every((byte) => byte === 0);
        const base = index * pointBytes;
        out.set(point.x, base);
        out.set(point.y, base + coordinateBytes);
        out.set(isInfinity ? zeroCoordinate : oneMontZ, base + 2 * coordinateBytes);
    });
    return out;
}
function unpackJacobianPoints(bytes, count, coordinateBytes, pointBytes) {
    const out = [];
    for (let i = 0; i < count; i += 1) {
        const base = i * pointBytes;
        out.push({
            x: cloneBytes(bytes.slice(base, base + coordinateBytes)),
            y: cloneBytes(bytes.slice(base + coordinateBytes, base + 2 * coordinateBytes)),
            z: cloneBytes(bytes.slice(base + 2 * coordinateBytes, base + 3 * coordinateBytes)),
        });
    }
    return out;
}
function affineFromJacobian(point) {
    return { x: cloneBytes(point.x), y: cloneBytes(point.y) };
}
function isAffineInfinity(point) {
    return point.x.every((byte) => byte === 0) && point.y.every((byte) => byte === 0);
}
function scalarBit(scalar, bit) {
    ensureByteLength(scalar, 32, "scalar");
    const byteIndex = Math.floor(bit / 8);
    const bitIndex = bit % 8;
    return ((scalar[byteIndex] >> bitIndex) & 1) !== 0;
}
export function createG1Module(context, options, fp) {
    const { curve, coordinateBytes, pointBytes, zeroHex, kernel } = options;
    const label = `${curve}-g1`;
    const zeroCoordinate = zeroBytes(coordinateBytes);
    const zeroJacobianPoint = { x: zeroBytes(coordinateBytes), y: zeroBytes(coordinateBytes), z: zeroBytes(coordinateBytes) };
    const zeroAffinePoint = { x: zeroBytes(coordinateBytes), y: zeroBytes(coordinateBytes) };
    const getOneMontgomery = lazyAsync(async () => fp.montOne());
    async function runJacobianBatch(opcode, inputA, inputB) {
        const count = Math.max(inputA.length, inputB.length);
        if (count === 0) {
            return [];
        }
        if (inputA.length !== count || inputB.length !== count) {
            throw new Error(`${label}: mismatched jacobian batch lengths`);
        }
        const output = await runSimpleKernel({
            device: context.device,
            pool: context.bufferPool,
            kernel,
            label: `${label}-op-${opcode}`,
            inputA: packJacobianPoints(inputA, coordinateBytes, pointBytes, `${label}.inputA`),
            inputB: packJacobianPoints(inputB, coordinateBytes, pointBytes, `${label}.inputB`),
            outputBytes: count * pointBytes,
            uniformWords: Uint32Array.from([count, opcode, 0, 0, 0, 0, 0, 0]),
            workgroups: Math.ceil(count / kernel.workgroupSize),
        });
        return unpackJacobianPoints(output, count, coordinateBytes, pointBytes);
    }
    async function runMixedBatch(opcode, inputA, inputB) {
        const count = Math.max(inputA.length, inputB.length);
        if (count === 0) {
            return [];
        }
        if (inputA.length !== count || inputB.length !== count) {
            throw new Error(`${label}: mismatched mixed batch lengths`);
        }
        const oneMontZ = await getOneMontgomery();
        const output = await runSimpleKernel({
            device: context.device,
            pool: context.bufferPool,
            kernel,
            label: `${label}-op-${opcode}`,
            inputA: packJacobianPoints(inputA, coordinateBytes, pointBytes, `${label}.inputA`),
            inputB: packAffinePoints(inputB, coordinateBytes, pointBytes, oneMontZ, zeroCoordinate, `${label}.inputB`),
            outputBytes: count * pointBytes,
            uniformWords: Uint32Array.from([count, opcode, 0, 0, 0, 0, 0, 0]),
            workgroups: Math.ceil(count / kernel.workgroupSize),
        });
        return unpackJacobianPoints(output, count, coordinateBytes, pointBytes);
    }
    async function runAffineInputBatch(opcode, inputA) {
        const count = inputA.length;
        if (count === 0) {
            return [];
        }
        const oneMontZ = await getOneMontgomery();
        const output = await runSimpleKernel({
            device: context.device,
            pool: context.bufferPool,
            kernel,
            label: `${label}-op-${opcode}`,
            inputA: packAffinePoints(inputA, coordinateBytes, pointBytes, oneMontZ, zeroCoordinate, `${label}.inputA`),
            inputB: packJacobianPoints(makeZeroJacobianBatch(count), coordinateBytes, pointBytes, `${label}.inputB`),
            outputBytes: count * pointBytes,
            uniformWords: Uint32Array.from([count, opcode, 0, 0, 0, 0, 0, 0]),
            workgroups: Math.ceil(count / kernel.workgroupSize),
        });
        return unpackJacobianPoints(output, count, coordinateBytes, pointBytes);
    }
    async function runJacobianUnary(opcode, point) {
        return (await runJacobianBatch(opcode, [point], [zeroJacobianPoint]))[0];
    }
    async function runMixedUnary(opcode, point, affine) {
        return (await runMixedBatch(opcode, [point], [affine]))[0];
    }
    async function runAffineUnary(opcode, affine) {
        return (await runAffineInputBatch(opcode, [affine]))[0];
    }
    function makeZeroJacobianBatch(count) {
        return Array.from({ length: count }, () => clonePoint(zeroJacobianPoint));
    }
    return {
        context,
        curve,
        coordinateBytes,
        pointBytes,
        zeroHex,
        affineInfinity() {
            return cloneAffine(zeroAffinePoint);
        },
        jacobianZero() {
            return clonePoint(zeroJacobianPoint);
        },
        async copy(point) {
            return runJacobianUnary(OP_COPY, point);
        },
        async copyBatch(points) {
            return runJacobianBatch(OP_COPY, points, Array.from({ length: points.length }, () => zeroJacobianPoint));
        },
        async jacobianInfinity() {
            return (await runJacobianBatch(OP_JAC_INFINITY, makeZeroJacobianBatch(1), makeZeroJacobianBatch(1)))[0];
        },
        async jacobianInfinityBatch(count) {
            const zeros = makeZeroJacobianBatch(count);
            return runJacobianBatch(OP_JAC_INFINITY, zeros, zeros);
        },
        async affineToJacobian(point) {
            return runAffineUnary(OP_AFFINE_TO_JAC, point);
        },
        async affineToJacobianBatch(points) {
            return runAffineInputBatch(OP_AFFINE_TO_JAC, points);
        },
        async negJacobian(point) {
            return runJacobianUnary(OP_NEG_JAC, point);
        },
        async negJacobianBatch(points) {
            return runJacobianBatch(OP_NEG_JAC, points, makeZeroJacobianBatch(points.length));
        },
        async doubleJacobian(point) {
            return runJacobianUnary(OP_DOUBLE_JAC, point);
        },
        async doubleJacobianBatch(points) {
            return runJacobianBatch(OP_DOUBLE_JAC, points, makeZeroJacobianBatch(points.length));
        },
        async addMixed(point, affine) {
            return runMixedUnary(OP_ADD_MIXED, point, affine);
        },
        async addMixedBatch(points, affine) {
            return runMixedBatch(OP_ADD_MIXED, points, affine);
        },
        async jacobianToAffine(point) {
            return affineFromJacobian(await runJacobianUnary(OP_JAC_TO_AFFINE, point));
        },
        async jacobianToAffineBatch(points) {
            return (await runJacobianBatch(OP_JAC_TO_AFFINE, points, makeZeroJacobianBatch(points.length))).map(affineFromJacobian);
        },
        async affineAdd(a, b) {
            const left = await runAffineInputBatch(OP_AFFINE_TO_JAC, [a]);
            return (await runMixedBatch(OP_AFFINE_ADD, left, [b]))[0];
        },
        async affineAddBatch(a, b) {
            const left = await runAffineInputBatch(OP_AFFINE_TO_JAC, a);
            return runMixedBatch(OP_AFFINE_ADD, left, b);
        },
        async scalarMulAffine(base, scalar) {
            return (await this.scalarMulAffineBatch([base], [scalar]))[0];
        },
        async scalarMulAffineBatch(bases, scalars) {
            if (bases.length !== scalars.length) {
                throw new Error(`${label}: mismatched scalar-mul batch lengths`);
            }
            const zeros = makeZeroJacobianBatch(bases.length);
            let acc = await runJacobianBatch(OP_JAC_INFINITY, zeros, zeros);
            for (let bit = 255; bit >= 0; bit -= 1) {
                acc = await runJacobianBatch(OP_DOUBLE_JAC, acc, zeros);
                const activeBases = bases.map((point, index) => (scalarBit(scalars[index], bit) ? point : cloneAffine(zeroAffinePoint)));
                if (activeBases.every(isAffineInfinity)) {
                    continue;
                }
                acc = await runMixedBatch(OP_ADD_MIXED, acc, activeBases);
            }
            return runJacobianBatch(OP_JAC_TO_AFFINE, acc, zeros);
        },
        async addAffine(a, b) {
            return affineFromJacobian(await this.affineAdd(a, b));
        },
        async addAffineBatch(a, b) {
            return (await this.affineAddBatch(a, b)).map(affineFromJacobian);
        },
        async negAffine(point) {
            return affineFromJacobian(await this.negJacobian(await this.affineToJacobian(point)));
        },
        async negAffineBatch(points) {
            return (await this.negJacobianBatch(await this.affineToJacobianBatch(points))).map(affineFromJacobian);
        },
        async doubleAffine(point) {
            return affineFromJacobian(await this.doubleJacobian(await this.affineToJacobian(point)));
        },
        async doubleAffineBatch(points) {
            return (await this.doubleJacobianBatch(await this.affineToJacobianBatch(points))).map(affineFromJacobian);
        },
        async scalarMulAffineResult(base, scalar) {
            return affineFromJacobian(await this.scalarMulAffine(base, scalar));
        },
        async scalarMulAffineResultBatch(bases, scalars) {
            return (await this.scalarMulAffineBatch(bases, scalars)).map(affineFromJacobian);
        },
    };
}
