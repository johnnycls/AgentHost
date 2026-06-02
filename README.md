# AgentHost — Universal Agent Host

Today there are many AI agent products, but they are fragmented — each has its
own system, there is no shared memory or state, and managing them is painful.
General-purpose agent frameworks rely on MCP, skills, or CLI tools to extend,
but these still fall short. **AgentHost** was created to solve this: a unified
system for managing and orchestrating AI agents that runs anywhere.

AgentHost is a cross-platform **agent host/runtime** that manages and orchestrates
autonomous AI agents compiled to **WebAssembly (wasm)**. It decouples agent logic
from the host environment — agents know nothing about whether they run on a
desktop browser, a smartwatch, smart glasses, an embedded device, or a server.

The project uses **Moonbit** for the host agent and **Rust / Moonbit / C** for
client agents, all compiled to `.wasm`. A lightweight **JavaScript distro**
(`SampleWebDistro/`) demonstrates how any platform can load and run agents
through a standardised host function ABI (`env.host_*`).

---

## Philosophy

- **Agents are wasm modules.** Every agent exports exactly one function: `run() -> i32`.
- **Platform-agnostic.** An agent never imports platform APIs (DOM, filesystem, network)
  directly. All I/O goes through a well-defined host-call interface (`host_display`,
  `host_log`, `host_get_clients`, `host_run_client_async`, `host_await_clients`,
  `host_get_result`).
- **Language-agnostic.** Agents can be written in **Rust**, **Moonbit**, **C** (via clang),
  or any language that targets `wasm32-unknown-unknown`.
- **Permission-based security.** Each agent declares the host functions it needs
  in `manifest.json`; the distro enforces the boundary at instantiation time.
- **Async-by-submit.** The host submits all client agents, awaits them together,
  then collects results — a synchronous busy-wait loop that feels concurrent to
  the agent developer.

---

## Project Structure

```
AgentHost/
├── ClientRuntime/                # Moonbit client runtime (@clientruntime)
│   ├── moon.mod.json             #   Package: agenthost/clientruntime
│   └── lib/
│       ├── moon.pkg.json
│       └── client.mbt            #   display(s), log(s) — wraps (ptr,len) ABI
│
├── ClientRuntimeRust/            # Rust client runtime (client-runtime crate)
│   ├── Cargo.toml
│   └── src/
│       └── lib.rs                #   display!(), log!() macros — core::fmt::Write
│
├── HostRuntime/                  # Moonbit host runtime (@hostruntime)
│   ├── moon.mod.json             #   Package: agenthost/hostruntime
│   └── lib/
│       ├── moon.pkg.json
│       ├── memory.mbt            #   Low-level inline-wasm: load_i32, store_byte, etc.
│       └── host.mbt              #   High-level: get_clients, run_client_async, etc.
│
├── HostAgent/                    # Host agent (Moonbit, the orchestrator)
│   ├── moon.mod.json
│   └── lib/
│       ├── moon.pkg.json
│       └── hello.mbt             #   pub fn run(): gets clients → submits → awaits → displays
│
├── SampleClientAgentRust/        # Rust client agent (7 * 6 = 42)
│   ├── Cargo.toml
│   └── src/
│       └── lib.rs                #   Uses client_runtime::display! / log!
│
├── SampleClientAgentMoonbit/     # Moonbit client agent (3 * 14 = 42)
│   ├── moon.mod.json
│   └── lib/
│       ├── moon.pkg.json
│       └── main.mbt              #   Uses @clientruntime.display / .log
│
├── SampleClientAgentC/           # C client agent (10 * 10 = 100)
│   └── main.c                    #   Uses __attribute__((import_module("env")))
│
└── SampleWebDistro/              # Reference distro (JS/HTML)
    ├── index.html
    ├── utils.js                  #   mem(), serializeNameList(), filterEnv()
    ├── runtime.js                #   buildHostEnv(), buildClientEnv()
    ├── agent.js                  #   makeContainer(), instantiate()
    ├── script.js                 #   Main orchestrator
    ├── styles.css                #   (empty — no CSS)
    └── agents/
        ├── manifest.json         #   Client declarations + permissions
        ├── host.wasm             #   Built HostAgent
        ├── client_rust.wasm      #   Built Rust client
        ├── client_moonbit.wasm   #   Built Moonbit client
        └── client_c.wasm         #   Built C client
```

---

## Prerequisites

| Tool        | Version                                        |
| ----------- | ---------------------------------------------- |
| Moonbit CLI | `~/.moon/bin/moonc` (v0.9.3+) + `moon`         |
| Rust        | `rustc` 1.95+, target `wasm32-unknown-unknown` |
| Clang/LLVM  | 18+ (for C agent)                              |
| wasm-ld     | Ships with rustup's wasm toolchain             |

---

## Building

### 1. Build the Host Runtime

```bash
cd HostRuntime
moon build --release --target wasm
```

### 2. Build the Host Agent

```bash
cd HostAgent
moon build --release --target wasm
```

### 3. Build the Rust Client Agent

```bash
cd ClientRuntimeRust
cargo build --release --target wasm32-unknown-unknown

cd ../SampleClientAgentRust
cargo build --release --target wasm32-unknown-unknown
```

### 4. Build the Moonbit Client Agent

```bash
cd ClientRuntime        # Moonbit client runtime
moon build --release --target wasm

cd ../SampleClientAgentMoonbit
moon build --release --target wasm
```

### 5. Build the C Client Agent

```bash
WASM_LD="$HOME/.rustup/toolchains/stable-x86_64-unknown-linux-gnu/lib/rustlib/x86_64-unknown-linux-gnu/bin/gcc-ld/wasm-ld"

cd SampleClientAgentC
clang --target=wasm32-unknown-unknown -nostdlib -O2 -c -o main.o main.c
$WASM_LD --no-entry --export=run --allow-undefined --import-undefined -o client_c.wasm main.o
```

### 6. Copy All Wasm Files to the Distro

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

_(Optionally run `moon-wasm-opt -O2` on each `.wasm` to reduce size.)_

---

## Running

### Start the HTTP server

```bash
cd SampleWebDistro
python3 -m http.server 8000
```

Then open **http://localhost:8000** in a browser. The page loads `script.js` which:

1. Fetches `agents/manifest.json`
2. Instantiates `host.wasm` with the full host environment
3. Instantiates each client wasm with a permission-filtered environment
4. Calls `host.run()` — the host orchestrates the clients
5. Each agent renders its own `<div>` via `host_display`

---

## Architecture

### Host functions available to agents

| Function                          | Signature                        | Host | Client |
| --------------------------------- | -------------------------------- | ---- | ------ |
| `host_display(ptr, len)`          | Writes HTML to agent's container | ✓    | ✓      |
| `host_log(ptr, len)`              | Appends text to agent's log      | ✓    | ✓      |
| `host_get_clients(ptr, len_ptr)`  | Returns serialised name list     | ✓    | ✗      |
| `host_run_client_async(ptr, len)` | Submits a client by name         | ✓    | ✗      |
| `host_await_clients(ptr, count)`  | Blocks until all complete        | ✓    | ✗      |
| `host_get_result(handle)`         | Retrieves i32 result             | ✓    | ✗      |

Permission control is declared in `manifest.json`:

```json
{
  "clients": [
    {
      "name": "client-rust",
      "path": "client_rust.wasm",
      "permission": ["host_display", "host_log"]
    }
  ]
}
```

---

## Writing Your Own Agent

### Rust agent

```rust
#![no_std]
use client_runtime::{log, display};

#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! { loop {} }

#[no_mangle]
pub extern "C" fn run() -> i32 {
    let result = 42;
    log!("Result: {}\n", result);
    display!("<div><b>{}</b></div>", result);
    result
}
```

### Moonbit agent

```moonbit
use @clientruntime

pub fn run() -> Int {
  let result = 42
  let _ = @clientruntime.log("Result: " + result.to_string() + "\n")
  let _ = @clientruntime.display("<div><b>" + result.to_string() + "</b></div>")
  result
}
```

### C agent

```c
__attribute__((import_module("env"), import_name("host_display")))
extern int host_display(const char *, int);

__attribute__((import_module("env"), import_name("host_log")))
extern int host_log(const char *, int);

#define S(s) s, sizeof(s) - 1

int run(void) {
    host_log(S("hello\n"));
    host_display(S("<div>hello</div>"));
    return 42;
}
```

---

## Adding a New Language

Any language that can target `wasm32-unknown-unknown` can be a client agent.
Requirements:

1. **Export** a `run()` function returning `i32`.
2. **Import** host functions from module `"env"` (at minimum `host_display`
   and `host_log`).
3. All strings are passed as `(ptr: i32, len: i32)` — the agent writes
   UTF-8 bytes into its own linear memory and passes the pointer + length.
4. Add the agent to `manifest.json` with the appropriate permissions.

---

## Running Tests

```bash
cd SampleWebDistro

node -e "
const fs = require('fs');
const reg = new Map();
const jobs = { nextHandle: 1, pending: new Map() };

// Build env, instantiate host, instantiate clients, run host...
// (See SampleWebDistro/script.js for the full pattern)
"
```

A full integration test is included in the repository's `SampleWebDistro/script.js`.
Run it via Node.js to verify all agents work without a browser.

---

## Key Design Decisions

- **`host_` prefix** for all host functions — Rust treats bare `log` as a math
  intrinsic that gets optimised away; Moonbit follows suit for consistency.
- **`(ptr, len)` ABI** — universal across all wasm targets; zero dependency on
  the Component Model or WASI. Every language can produce it.
- **Each agent gets one `<div>`** — `host_display` replaces content via
  `innerHTML`, `host_log` appends via `textContent +=`.
- **Scratch buffer at 8192** — shared temporary space. Handles buffer at 49152
  (above Moonbit heap, which ends around 10500 for the current codebase).
- **Async = sync busy-wait** — the JS distro loops through handles and runs
  each client's `run()` synchronously. The host sees `submit` → `await` →
  `collect` semantics.
- **Permission filtering** — a single `buildEnv` creates all six host functions;
  `filterEnv` strips ones not listed in `manifest.json.permission` before passing
  to a client instance.

---

## Roadmap — Distro Evolution (`SampleWebDistro/`)

The reference distro is evolving from a static demo into a full **agent store**
with LLM integration, memory, and agent lifecycle management.

### Phase 1: Settings & LLM Integration

- [ ] **Settings panel** — base system prompt for host agent, LLM provider/model,
      temperature, max tokens, API key input
- [ ] **Chat input** — text input rendered by the host agent; pressing Enter sends
      the message to the LLM alongside the system prompt
- [ ] **LLM host function** — a new `host_llm_chat(messages_ptr, len) -> i32` that
      streams or returns the LLM response; the distro injects the actual API call
- [ ] **Streaming output** — LLM response tokens stream into the host agent's
      container in real time

### Phase 2: Agentic Loop

- [ ] **React-based loop** — host agent calls LLM → LLM responds with tool calls
      (client agent names + args) → host submits clients → collects results →
      feeds back to LLM → repeat until done
- [ ] **Concurrent client handling** — submit multiple clients in parallel, await
      all, collect results, present to LLM for next decision
- [ ] **Base system prompt loading** — load a prompt from URL or local file at
      startup, inject into the host agent's memory
- [ ] **`host_llm_tool_result(result_ptr, len)`** — send a client agent's result
      back to the LLM as a tool response

### Phase 3: 3-Layer Memory & File System

- [ ] **Per-agent folder** — each agent gets a sandboxed directory
      (`agents/<name>/`); the agent can only read/write inside its own folder
- [ ] **`host_read_file(path_ptr, len, out_ptr, out_len_ptr) -> i32`** — read a
      file from the agent's folder
- [ ] **`host_write_file(path_ptr, len, data_ptr, data_len) -> i32`** — write a
      file to the agent's folder
- [ ] **`host_list_files(out_ptr, out_len_ptr) -> i32`** — list files in the
      agent's folder
- [ ] **`host_delete_file(path_ptr, len) -> i32`** — delete a file
- [ ] **3-layer memory:**
  - **L1 — Working memory:** in-memory key-value store (survives one `run()` call)
  - **L2 — File memory:** persisted to the agent's folder as JSON files
  - **L3 — Compressed context:** sliding window of recent LLM interactions,
        compressed via summarisation before being stored
- [ ] **Context compression** — when L3 exceeds a token budget, the distro calls
      the LLM to summarise old context before pruning

### Phase 4: Agent Store

- [ ] **Agent store UI** — a "Store" tab listing downloadable agent wasm files
      from a remote registry
- [ ] **`agent-store.json`** — describes available agents (name, description,
      version, download URL, permissions, supported runtimes)
- [ ] **Download agent** — fetch `.wasm` from URL, save to `agents/<name>/`,
      add entry to `manifest.json` with auto-detected permissions
- [ ] **Remove agent** — delete `.wasm` and folder, remove from `manifest.json`
- [ ] **Update agent** — re-download a newer version of an installed agent
- [ ] **Permission-aware download** — the store UI shows what permissions each
      agent requires; the user approves before installing

### Phase 5: Polish & DX

- [ ] **Elegant agent display** — each agent container rendered as a card with
      avatar/icon, status badge (running/done/error), collapse/expand, timestamp,
      reorder by drag-and-drop
- [ ] **Log viewer** — per-agent expandable log panel with search/filter
- [ ] **Dark mode** — CSS variables, system-preference detection
- [ ] **Import/export** -- export the full workspace (manifest + agents + settings)
      as a single JSON file; import to restore
- [ ] **Keyboard shortcuts** — `Ctrl+Enter` to send, `Esc` to clear input,
      `Ctrl+Shift+R` to restart all agents

### Client Agent Runtimes

- [ ] **ClientRuntimeRust** — add Cargo features for every new permission
      (`host_llm_chat`, `host_read_file`, `host_write_file`, etc.)
- [ ] **`@clientruntime` (Moonbit)** — add corresponding public functions for
      each new permission, feature-gated at the JS level
- [ ] **Update `README.md` agent-writing guides** — show usage of new host
      functions for each language
- [ ] **Version bump** — keep `moon.json` / `Cargo.toml` versions in sync with
      the ABI spec

---
