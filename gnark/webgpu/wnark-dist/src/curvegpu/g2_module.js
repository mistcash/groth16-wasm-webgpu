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
function zeroFp2(size) {
    return { c0: zeroBytes(size), c1: zeroBytes(size) };
}
function cloneFp2(value) {
    return { c0: cloneBytes(value.c0), c1: cloneBytes(value.c1) };
}
function cloneJacobian(point) {
    return {
        x: cloneFp2(point.x),
        y: cloneFp2(point.y),
        z: cloneFp2(point.z),
    };
}
function cloneAffine(point) {
    return {
        x: cloneFp2(point.x),
        y: cloneFp2(point.y),
    };
}
function ensureFp2(value, componentBytes, label) {
    ensureByteLength(value.c0, componentBytes, `${label}.c0`);
    ensureByteLength(value.c1, componentBytes, `${label}.c1`);
}
function fp2IsZero(value) {
    return value.c0.every((byte) => byte === 0) && value.c1.every((byte) => byte === 0);
}
function isAffineInfinity(point) {
    return fp2IsZero(point.x) && fp2IsZero(point.y);
}
function scalarBit(scalar, bit) {
    ensureByteLength(scalar, 32, "scalar");
    const byteIndex = Math.floor(bit / 8);
    const bitIndex = bit % 8;
    return ((scalar[byteIndex] >> bitIndex) & 1) !== 0;
}
function packFp2(out, offset, value) {
    out.set(value.c0, offset);
    out.set(value.c1, offset + value.c0.byteLength);
}
function packJacobianPoints(points, componentBytes, pointBytes, label) {
    const out = new Uint8Array(points.length * pointBytes);
    points.forEach((point, index) => {
        ensureFp2(point.x, componentBytes, `${label}[${index}].x`);
        ensureFp2(point.y, componentBytes, `${label}[${index}].y`);
        ensureFp2(point.z, componentBytes, `${label}[${index}].z`);
        const base = index * pointBytes;
        packFp2(out, base, point.x);
        packFp2(out, base + 2 * componentBytes, point.y);
        packFp2(out, base + 4 * componentBytes, point.z);
    });
    return out;
}
function packAffinePoints(points, componentBytes, pointBytes, oneMontZ, zeroCoordinate, label) {
    const out = new Uint8Array(points.length * pointBytes);
    points.forEach((point, index) => {
        ensureFp2(point.x, componentBytes, `${label}[${index}].x`);
        ensureFp2(point.y, componentBytes, `${label}[${index}].y`);
        const isInfinity = fp2IsZero(point.x) && fp2IsZero(point.y);
        const base = index * pointBytes;
        packFp2(out, base, point.x);
        packFp2(out, base + 2 * componentBytes, point.y);
        packFp2(out, base + 4 * componentBytes, isInfinity ? zeroCoordinate : oneMontZ);
    });
    return out;
}
function unpackFp2(bytes, offset, componentBytes) {
    return {
        c0: cloneBytes(bytes.slice(offset, offset + componentBytes)),
        c1: cloneBytes(bytes.slice(offset + componentBytes, offset + 2 * componentBytes)),
    };
}
function unpackJacobianPoints(bytes, count, componentBytes, pointBytes) {
    const out = [];
    for (let i = 0; i < count; i += 1) {
        const base = i * pointBytes;
        out.push({
            x: unpackFp2(bytes, base, componentBytes),
            y: unpackFp2(bytes, base + 2 * componentBytes, componentBytes),
            z: unpackFp2(bytes, base + 4 * componentBytes, componentBytes),
        });
    }
    return out;
}
function affineFromJacobian(point) {
    return {
        x: cloneFp2(point.x),
        y: cloneFp2(point.y),
    };
}
export function createG2Module(context, options, fp) {
    const { curve, componentBytes, coordinateBytes, pointBytes, kernel } = options;
    const label = `${curve}-g2`;
    const zeroCoordinate = zeroFp2(componentBytes);
    const zeroJacobianPoint = {
        x: zeroFp2(componentBytes),
        y: zeroFp2(componentBytes),
        z: zeroFp2(componentBytes),
    };
    const zeroAffinePoint = {
        x: zeroFp2(componentBytes),
        y: zeroFp2(componentBytes),
    };
    const getOneMontgomery = lazyAsync(async () => {
        const c0 = await fp.montOne();
        const c1 = zeroBytes(componentBytes);
        return { c0, c1 };
    });
    function makeZeroJacobianBatch(count) {
        return Array.from({ length: count }, () => cloneJacobian(zeroJacobianPoint));
    }
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
            inputA: packJacobianPoints(inputA, componentBytes, pointBytes, `${label}.inputA`),
            inputB: packJacobianPoints(inputB, componentBytes, pointBytes, `${label}.inputB`),
            outputBytes: count * pointBytes,
            uniformWords: Uint32Array.from([count, opcode, 0, 0, 0, 0, 0, 0]),
            workgroups: Math.ceil(count / kernel.workgroupSize),
        });
        return unpackJacobianPoints(output, count, componentBytes, pointBytes);
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
            inputA: packJacobianPoints(inputA, componentBytes, pointBytes, `${label}.inputA`),
            inputB: packAffinePoints(inputB, componentBytes, pointBytes, oneMontZ, zeroCoordinate, `${label}.inputB`),
            outputBytes: count * pointBytes,
            uniformWords: Uint32Array.from([count, opcode, 0, 0, 0, 0, 0, 0]),
            workgroups: Math.ceil(count / kernel.workgroupSize),
        });
        return unpackJacobianPoints(output, count, componentBytes, pointBytes);
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
            inputA: packAffinePoints(inputA, componentBytes, pointBytes, oneMontZ, zeroCoordinate, `${label}.inputA`),
            inputB: packJacobianPoints(makeZeroJacobianBatch(count), componentBytes, pointBytes, `${label}.inputB`),
            outputBytes: count * pointBytes,
            uniformWords: Uint32Array.from([count, opcode, 0, 0, 0, 0, 0, 0]),
            workgroups: Math.ceil(count / kernel.workgroupSize),
        });
        return unpackJacobianPoints(output, count, componentBytes, pointBytes);
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
    return {
        context,
        curve,
        componentBytes,
        coordinateBytes,
        pointBytes,
        affineInfinity() {
            return cloneAffine(zeroAffinePoint);
        },
        jacobianZero() {
            return cloneJacobian(zeroJacobianPoint);
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
            return runJacobianBatch(OP_NEG_JAC, points, Array.from({ length: points.length }, () => zeroJacobianPoint));
        },
        async doubleJacobian(point) {
            return runJacobianUnary(OP_DOUBLE_JAC, point);
        },
        async doubleJacobianBatch(points) {
            return runJacobianBatch(OP_DOUBLE_JAC, points, Array.from({ length: points.length }, () => zeroJacobianPoint));
        },
        async addMixed(point, affine) {
            return runMixedUnary(OP_ADD_MIXED, point, affine);
        },
        async addMixedBatch(points, affine) {
            return runMixedBatch(OP_ADD_MIXED, points, affine);
        },
        async jacobianToAffine(point) {
            return affineFromJacobian((await runJacobianBatch(OP_JAC_TO_AFFINE, [point], [zeroJacobianPoint]))[0]);
        },
        async jacobianToAffineBatch(points) {
            return (await runJacobianBatch(OP_JAC_TO_AFFINE, points, Array.from({ length: points.length }, () => zeroJacobianPoint))).map(affineFromJacobian);
        },
        async affineAdd(a, b) {
            const left = await runAffineInputBatch(OP_AFFINE_TO_JAC, [a]);
            return (await runMixedBatch(OP_AFFINE_ADD, left, [b]))[0];
        },
        async affineAddBatch(a, b) {
            if (a.length !== b.length) {
                throw new Error(`${label}: mismatched affine batch lengths`);
            }
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
