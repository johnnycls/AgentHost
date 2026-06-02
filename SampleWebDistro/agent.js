export const makeContainer = (id) => {
    const el = document.createElement('div');
    el.id = `c-${id}`;
    document.getElementById('agents').appendChild(el);
    return el;
};

export const fetchWasm = (url) => fetch(url).then((r) => r.arrayBuffer());

export const instantiate = async (memRef, url, env) => {
    const mod = await WebAssembly.compile(await fetchWasm(url));
    const inst = await WebAssembly.instantiate(mod, { env });
    memRef.memory = inst.exports.memory;
    return inst;
};
