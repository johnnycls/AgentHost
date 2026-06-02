export const SCRATCH_BUF_SIZE = 4096;

export const u32 = (n) => [
  n & 0xff,
  (n >> 8) & 0xff,
  (n >> 16) & 0xff,
  (n >> 24) & 0xff,
];

export const serializeArray = (items, encodeItem) =>
  new Uint8Array([...u32(items.length), ...items.flatMap(encodeItem)]);

export const encodeName = (n) => {
  const b = new TextEncoder().encode(n);
  return [...u32(b.length), ...b];
};

export const serializeNameList = (names) => serializeArray(names, encodeName);

export const filterEnv = (env, permissions) =>
  Object.fromEntries(
    Object.entries(env).filter(([k]) => permissions.includes(k)),
  );

export const mem = (memRef) => ({
  readStr: (ptr, len) =>
    new TextDecoder().decode(new Uint8Array(memRef.memory.buffer, ptr, len)),
  readI32: (ptr) => new DataView(memRef.memory.buffer).getInt32(ptr, true),
  writeI32: (ptr, val) =>
    new DataView(memRef.memory.buffer).setInt32(ptr, val, true),
  writeBytes: (ptr, bytes) =>
    new Uint8Array(memRef.memory.buffer, ptr, bytes.length).set(bytes),
});
