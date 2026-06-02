# AgentHost — AGENTS.md

## Build order (must be sequential for correct deps)

```bash
# 1. Moonbit runtimes (must build before agents)
moon build --release --target wasm              # HostRuntime/
moon build --release --target wasm              # ClientRuntime/

# 2. Rust client runtime
cargo build --release --target wasm32-unknown-unknown  # ClientRuntimeRust/

# 3. Agents (depend on runtimes above)
moon build --release --target wasm              # HostAgent/
moon build --release --target wasm              # SampleClientAgentMoonbit/
cargo build --release --target wasm32-unknown-unknown  # SampleClientAgentRust/

# 4. C agent (standalone, no runtime dep)
WASM_LD="$HOME/.rustup/toolchains/stable-x86_64-unknown-linux-gnu/lib/rustlib/x86_64-unknown-linux-gnu/bin/gcc-ld/wasm-ld"
clang --target=wasm32-unknown-unknown -nostdlib -O2 -c -o main.o main.c
$WASM_LD --no-entry --export=run --allow-undefined --import-undefined -o client_c.wasm main.o
```

## Copy wasm to distro (names differ from build outputs)

```bash
cp HostAgent/_build/wasm/release/build/hostagent.wasm \
   SampleWebDistro/agents/host.wasm

cp SampleClientAgentRust/target/wasm32-unknown-unknown/release/sample_client_agent.wasm \
   SampleWebDistro/agents/client_rust.wasm

cp SampleClientAgentMoonbit/_build/wasm/release/build/sample-client-moonbit.wasm \
   SampleWebDistro/agents/client_moonbit.wasm

cp SampleClientAgentC/client_c.wasm \
   SampleWebDistro/agents/client_c.wasm
```

## Run

```bash
cd SampleWebDistro && python3 -m http.server 8000
```

## Tool paths & versions

- Moonbit CLI: `~/.moon/bin/moon` (v0.9.3, `source = "lib"` in moon.mod.json)
- wasm-ld: ships with rustup wasm toolchain at `.../gcc-ld/wasm-ld`
- Rust target: `wasm32-unknown-unknown`, rustc 1.95+

## Moonbit quirks

- `@pkgname/subpkg.fn()` cross-package syntax is **not supported** in v0.9.3 — no subpackage re-exports
- `pub fn run()` must be `pub` else DCE strips the export
- `"export-memory-name": "memory"` required in moon.pkg.json link section
- `"import"` in moon.pkg.json uses full name: `"agenthost/pkgname"`
- Source uses `@pkgname.fn()` directly (no `use` statement needed)
- Path deps in moon.mod.json: `"agenthost/pkgname": {"path": "../RelativePath"}`

## Rust quirks

- `crate-type = ["cdylib"]` for agents, `["lib"]` for runtime
- Always `#![no_std]` + custom `#[panic_handler]` + `#[no_mangle] pub extern "C" fn run()`
- `client-runtime` Cargo features: `display`, `log` (both on by default)
- Release profile: `opt-level = "s"` + `lto = true`

## C agent quirks

- `__attribute__((import_module("env"), import_name("host_xxx")))` for every host import
- `#define S(s) s, sizeof(s) - 1` macro for string length (avoids missing `strlen` in wasm32-unknown-unknown)
- No libc available: no `strlen`, no `printf`

## Memory layout (critical)

| Offset  | Use                        | Owner           |
|---------|----------------------------|-----------------|
| 0–65535 | Moonbit heap + data section| agent           |
| 2048    | scratch buffer (client)    | ClientRuntime   |
| 8192    | scratch buffer (host)      | HostRuntime     |
| 49152   | handles buffer             | HostRuntime     |

Moonbit heap ends ~10506 for current code. The handles buffer at 49152 stays above it. **Do not change offsets without verifying heap boundary.**

## ABI rules

- All host functions imported from module `"env"` only
- Strings: `(ptr: i32, len: i32)` pointing into agent's linear memory, UTF-8
- `host_` prefix on all host fn names (Rust optimises bare `log` as math intrinsic)
- Each agent exports exactly `run() -> i32`; no other exports

## JS distro (SampleWebDistro/)

- Pure ES modules, no bundler, served via `python3 -m http.server 8000`
- Entry: `index.html` → `script.js` (module) → `runtime.js` + `agent.js` + `utils.js`
- Each agent gets its own `WebAssembly.Memory` (separate linear memory)
- Permission enforcement: `buildClientEnv` in `runtime.js` injects `trap()` stubs (throw Error) for functions not listed in `manifest.json`; wasm always instantiates
- Manifest format: `{ "clients": [{ "name", "path", "description", "permission": ["host_display", ...] }] }`

## Host-only vs client-available permissions

| Function                          | Host | Client |
|-----------------------------------|------|--------|
| `host_display`                    | ✓    | ✓      |
| `host_log`                        | ✓    | ✓      |
| `host_get_clients`                | ✓    | ✗      |
| `host_run_client_async`           | ✓    | ✗      |
| `host_await_clients`              | ✓    | ✗      |
| `host_get_result`                 | ✓    | ✗      |

Client agents cannot import host-only functions; `buildClientEnv` does not provide them.

## Package dependency graph

```
HostRuntime (Moonbit) ← HostAgent (Moonbit)
ClientRuntime (Moonbit) ← SampleClientAgentMoonbit (Moonbit)
ClientRuntimeRust (Rust) ← SampleClientAgentRust (Rust)
SampleClientAgentC — standalone (no runtime lib)
SampleWebDistro — loads all compiled .wasm files at runtime
```

## File types ignored by .gitignore

`target/`, `_build/`, `*.o`, `*.swp`, `node_modules/` — build artifacts are never committed.
