function logComputePipelineCreation(label, entryPoint, debug) {
    if (!debug) {
        return;
    }
    const key = "__curvegpuComputePipelineCreateCount";
    const state = globalThis;
    const count = (state[key] ?? 0) + 1;
    state[key] = count;
    console.debug(`[curvegpu] createComputePipeline #${count}: ${label} entry=${entryPoint}`);
}
export async function createMSMKernelSetAsync(device, shaderCode, labelPrefix, entryPoints, debug = false) {
    const shaderModule = device.createShaderModule({
        label: `${labelPrefix}-shader`,
        code: shaderCode,
    });
    const bindGroupLayout = device.createBindGroupLayout({
        label: `${labelPrefix}-bgl`,
        entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
            { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
            { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        ],
    });
    const pipelineLayout = device.createPipelineLayout({
        label: `${labelPrefix}-pl`,
        bindGroupLayouts: [bindGroupLayout],
    });
    const out = {};
    await Promise.all(Object.entries(entryPoints).map(async ([name, entryPoint]) => {
        logComputePipelineCreation(`${labelPrefix}-${entryPoint}`, entryPoint, debug);
        const pipeline = await device.createComputePipelineAsync({
            label: `${labelPrefix}-${entryPoint}`,
            layout: pipelineLayout,
            compute: { module: shaderModule, entryPoint },
        });
        out[name] = { pipeline, bindGroupLayout };
    }));
    return out;
}
export function createStorageBufferFromBytes(device, label, bytes, size) {
    const buffer = device.createBuffer({
        label,
        size,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    if (bytes.byteLength > 0) {
        device.queue.writeBuffer(buffer, 0, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    }
    return buffer;
}
export function createU32StorageBuffer(device, label, values) {
    const buffer = device.createBuffer({
        label,
        size: Math.max(4, values.byteLength),
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    if (values.byteLength > 0) {
        device.queue.writeBuffer(buffer, 0, values.buffer.slice(values.byteOffset, values.byteOffset + values.byteLength));
    }
    return buffer;
}
export function createEmptyPointStorageBuffer(device, label, count, pointBytes) {
    return device.createBuffer({
        label,
        size: Math.max(1, count) * pointBytes,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
}
export function createParamsBuffer(device, label, uniformBytes, values) {
    const buffer = device.createBuffer({
        label,
        size: uniformBytes,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const params = new Uint32Array(uniformBytes / 4);
    params[0] = values.count;
    params[1] = values.opcode ?? 0;
    params[2] = values.termsPerInstance ?? 0;
    params[3] = values.window ?? 0;
    params[4] = values.numWindows ?? 0;
    params[5] = values.bucketCount ?? 0;
    params[6] = values.rowWidth ?? 0;
    device.queue.writeBuffer(buffer, 0, params.buffer);
    return buffer;
}
export function createBindGroupForBuffers(device, kernel, label, inputA, inputB, output, params, meta0, meta1, meta2) {
    const metaA = meta0 ?? inputB;
    const metaB = meta1 ?? inputB;
    const metaC = meta2 ?? inputB;
    return device.createBindGroup({
        label,
        layout: kernel.bindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: inputA } },
            { binding: 1, resource: { buffer: inputB } },
            { binding: 2, resource: { buffer: output } },
            { binding: 3, resource: { buffer: params } },
            { binding: 4, resource: { buffer: metaA } },
            { binding: 5, resource: { buffer: metaB } },
            { binding: 6, resource: { buffer: metaC } },
        ],
    });
}
export async function submitKernel(device, kernel, bindGroup, count, label, workgroupSize = 64, debug = false) {
    if (debug) {
        console.debug(`[curvegpu] submitKernel start: ${label} count=${count}`);
    }
    const encoder = device.createCommandEncoder({ label: `${label}-encoder` });
    const pass = encoder.beginComputePass({ label: `${label}-pass` });
    pass.setPipeline(kernel.pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(count / workgroupSize));
    pass.end();
    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();
    if (debug) {
        console.debug(`[curvegpu] submitKernel done: ${label}`);
    }
}
export async function readbackBuffer(device, buffer, size) {
    const staging = device.createBuffer({
        label: "g1-readback-staging",
        size,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const encoder = device.createCommandEncoder({ label: "g1-readback-encoder" });
    encoder.copyBufferToBuffer(buffer, 0, staging, 0, size);
    device.queue.submit([encoder.finish()]);
    await staging.mapAsync(GPUMapMode.READ);
    const bytes = new Uint8Array(staging.getMappedRange()).slice();
    staging.unmap();
    staging.destroy();
    return bytes;
}
