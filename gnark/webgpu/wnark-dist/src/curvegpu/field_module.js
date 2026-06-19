import { cloneBytes, ensureByteLength, lazyAsync, packElementBatch, runSimpleKernel, unpackElementBatch, } from "./runtime_common.js";
const OP_COPY = 0;
const OP_ONE = 2;
const OP_ADD = 3;
const OP_SUB = 4;
const OP_NEG = 5;
const OP_DOUBLE = 6;
const OP_NORMALIZE = 7;
const OP_EQUAL = 8;
const OP_MUL = 9;
const OP_SQUARE = 10;
const OP_TO_MONT = 11;
const OP_FROM_MONT = 12;
function zeros(count, byteSize) {
    return Array.from({ length: count }, () => new Uint8Array(byteSize));
}
function isNonZero(bytes) {
    return bytes.some((byte) => byte !== 0);
}
function ensurePackedElements(bytes, byteSize, label) {
    if (bytes.byteLength % byteSize !== 0) {
        throw new Error(`${label}: expected a multiple of ${byteSize} bytes, got ${bytes.byteLength}`);
    }
    return bytes.byteLength / byteSize;
}
export function createFieldModule(context, curve, field, options) {
    const { byteSize, kernel, entryPoint: _entryPoint, label, shape } = options;
    const zeroValue = new Uint8Array(byteSize);
    async function runPacked(opcode, inputA, inputB) {
        const count = ensurePackedElements(inputA, byteSize, `${label}.packedA`);
        const b = inputB ?? new Uint8Array(inputA.byteLength);
        if (b.byteLength !== inputA.byteLength) {
            throw new Error(`${label}.packedB: expected ${inputA.byteLength} bytes, got ${b.byteLength}`);
        }
        return runSimpleKernel({
            device: context.device,
            pool: context.bufferPool,
            kernel,
            label: `${label}-packed-op-${opcode}`,
            inputA,
            inputB: b,
            outputBytes: count * byteSize,
            uniformWords: Uint32Array.from([count, opcode, 0, 0, 0, 0, 0, 0]),
            workgroups: Math.ceil(count / kernel.workgroupSize),
        });
    }
    async function runBatch(opcode, inputA, inputB) {
        const count = Math.max(inputA.length, inputB.length);
        if (count === 0) {
            return [];
        }
        const a = inputA.length === 0 ? zeros(count, byteSize) : inputA;
        const b = inputB.length === 0 ? zeros(count, byteSize) : inputB;
        if (a.length !== count || b.length !== count) {
            throw new Error(`${label}: mismatched batch lengths`);
        }
        const output = await runSimpleKernel({
            device: context.device,
            kernel,
            label: `${label}-op-${opcode}`,
            inputA: packElementBatch(a, byteSize, `${label}.inputA`),
            inputB: packElementBatch(b, byteSize, `${label}.inputB`),
            outputBytes: count * byteSize,
            uniformWords: Uint32Array.from([count, opcode, 0, 0, 0, 0, 0, 0]),
            workgroups: Math.ceil(count / kernel.workgroupSize),
        });
        return unpackElementBatch(output, byteSize, count);
    }
    async function runUnary(opcode, value) {
        ensureByteLength(value, byteSize, `${label}.value`);
        return (await runBatch(opcode, [value], [zeroValue]))[0];
    }
    async function runBinary(opcode, a, b) {
        ensureByteLength(a, byteSize, `${label}.a`);
        ensureByteLength(b, byteSize, `${label}.b`);
        return (await runBatch(opcode, [a], [b]))[0];
    }
    const getMontOne = lazyAsync(async () => cloneBytes((await runBatch(OP_ONE, [zeroValue], [zeroValue]))[0]));
    return {
        context,
        curve,
        field,
        shape,
        byteSize,
        zero() {
            return cloneBytes(zeroValue);
        },
        async copy(value) {
            return runUnary(OP_COPY, value);
        },
        async copyBatch(values) {
            return runBatch(OP_COPY, values, values);
        },
        async montOne() {
            return cloneBytes(await getMontOne());
        },
        async equal(a, b) {
            return isNonZero(await runBinary(OP_EQUAL, a, b));
        },
        async equalBatch(a, b) {
            return (await runBatch(OP_EQUAL, a, b)).map(isNonZero);
        },
        async add(a, b) {
            return runBinary(OP_ADD, a, b);
        },
        async addBatch(a, b) {
            return runBatch(OP_ADD, a, b);
        },
        async sub(a, b) {
            return runBinary(OP_SUB, a, b);
        },
        async subBatch(a, b) {
            return runBatch(OP_SUB, a, b);
        },
        async neg(value) {
            return runUnary(OP_NEG, value);
        },
        async negBatch(values) {
            return runBatch(OP_NEG, values, zeros(values.length, byteSize));
        },
        async double(value) {
            return runUnary(OP_DOUBLE, value);
        },
        async doubleBatch(values) {
            return runBatch(OP_DOUBLE, values, zeros(values.length, byteSize));
        },
        async mul(a, b) {
            return runBinary(OP_MUL, a, b);
        },
        async mulBatch(a, b) {
            return runBatch(OP_MUL, a, b);
        },
        async mulPackedMont(a, b) {
            return runPacked(OP_MUL, a, b);
        },
        async square(value) {
            return runUnary(OP_SQUARE, value);
        },
        async squareBatch(values) {
            return runBatch(OP_SQUARE, values, zeros(values.length, byteSize));
        },
        async normalizeMont(value) {
            return runUnary(OP_NORMALIZE, value);
        },
        async normalizeMontBatch(values) {
            return runBatch(OP_NORMALIZE, values, zeros(values.length, byteSize));
        },
        async toMontgomery(value) {
            return runUnary(OP_TO_MONT, value);
        },
        async toMontgomeryBatch(values) {
            return runBatch(OP_TO_MONT, values, zeros(values.length, byteSize));
        },
        async toMontgomeryPacked(values) {
            return runPacked(OP_TO_MONT, values);
        },
        async fromMontgomery(value) {
            return runUnary(OP_FROM_MONT, value);
        },
        async fromMontgomeryBatch(values) {
            return runBatch(OP_FROM_MONT, values, zeros(values.length, byteSize));
        },
        async fromMontgomeryPacked(values) {
            return runPacked(OP_FROM_MONT, values);
        },
    };
}
