import { SCRATCH_BUF_SIZE, serializeNameList, mem } from './utils.js';

const display = (m, container) => (ptr, len) => {
    container.innerHTML = m.readStr(ptr, len);
    return 0;
};

const log = (m, container) => (ptr, len) => {
    const msg = m.readStr(ptr, len);
    console.log(msg);
    container.textContent += msg + '\n';
    return 0;
};

const getClients = (m, registry) => (outPtr, outLenPtr) => {
    const names = [...registry.keys()].filter((n) => n !== 'host');
    const data = serializeNameList(names);
    if (data.length > SCRATCH_BUF_SIZE) return -1;
    m.writeBytes(outPtr, data);
    m.writeI32(outLenPtr, data.length);
    return 0;
};

const runClientAsync = (m, jobs) => (namePtr, nameLen) => {
    const name = m.readStr(namePtr, nameLen);
    const handle = jobs.nextHandle++;
    jobs.pending.set(handle, { name, result: null });
    return handle;
};

const awaitClients = (m, registry, jobs) => (handlesPtr, count) => {
    for (let i = 0; i < count; i++) {
        const handle = m.readI32(handlesPtr + i * 4);
        const job = jobs.pending.get(handle);
        if (!job || job.result !== null) continue;
        const entry = registry.get(job.name);
        if (!entry) { job.result = -1; continue; }
        job.result = entry.instance.exports.run();
    }
    return 0;
};

const getResult = (_, jobs) => (handle) => {
    const job = jobs.pending.get(handle);
    return job && job.result !== null ? job.result : -1;
};

const buildFullEnv = (memRef, container, registry, jobs) => {
    const m = mem(memRef);
    return {
        host_display: display(m, container),
        host_log: log(m, container),
        host_get_clients: getClients(m, registry),
        host_run_client_async: runClientAsync(m, jobs),
        host_await_clients: awaitClients(m, registry, jobs),
        host_get_result: getResult(m, jobs),
    };
};

export const buildHostEnv = (memRef, container, registry, jobs) =>
    buildFullEnv(memRef, container, registry, jobs);

const trap = (name) => () => {
    throw new Error(`Permission denied: client agent called '${name}' which is not granted in manifest`);
};

export const buildClientEnv = (memRef, container, permissions) => {
    const m = mem(memRef);
    const allFunctions = {
        host_display: display(m, container),
        host_log: log(m, container),
    };
    const env = {};
    for (const [name, fn] of Object.entries(allFunctions)) {
        env[name] = permissions.includes(name) ? fn : trap(name);
    }
    return env;
};
