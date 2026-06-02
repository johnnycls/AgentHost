import { buildHostEnv, buildClientEnv } from "./runtime.js";
import { makeContainer, instantiate } from "./agent.js";

const main = async () => {
  const manifest = await fetch("agents/manifest.json").then((r) => r.json());
  const registry = new Map();
  const jobs = { nextHandle: 1, pending: new Map() };

  const hostMem = { memory: null };
  const hostContainer = makeContainer("host");
  const hostInst = await instantiate(
    hostMem,
    "agents/host.wasm",
    buildHostEnv(hostMem, hostContainer, registry, jobs),
  );
  registry.set("host", { instance: hostInst });

  await Promise.all(
    manifest.clients.map(async (config) => {
      const memRef = { memory: null };
      const container = makeContainer(config.name);
      const env = buildClientEnv(memRef, container, config.permission);
      const inst = await instantiate(memRef, `agents/${config.path}`, env);
      registry.set(config.name, { instance: inst });
    }),
  );

  hostInst.exports.run();
};

main().catch((err) => {
  console.error("Boot failed:", err);
  const el = document.getElementById("agents");
  if (el) {
    const pre = document.createElement("pre");
    pre.textContent = `${err.message}\n${err.stack || ""}`;
    el.appendChild(pre);
  }
});
