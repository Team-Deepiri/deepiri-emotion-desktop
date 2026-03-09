# Plan: Interactive TUI CLI (Claude-style)

This document describes the architecture and implementation plan for a terminal CLI that feels like Claude CLI / Cursor terminal: event-driven UI, streaming, agent step visualization, spinners, and diff-based rendering.

---

## 1. Scope

- **Deliverable:** A standalone Node.js CLI (run via `npm run cli` or `node cli/index.js`) that:
  - Runs in the terminal (no Electron).
  - Renders an interactive TUI: prompt input, message list, streaming responses, agent step timeline, spinners.
  - Uses the same AI backend as the desktop app (Cyrex / OpenAI / etc.) for chat completion.
  - Can be extended with tools (read_file, search, run_command) and an agent step FSM.
- **Out of scope for v1:** Full agentic loop with planner + multiple tools; focus on chat + streaming + step-like status updates.

---

## 2. High-level architecture

```
Terminal (stdin/stdout)
        │
Input layer (keypress / readline or Ink input)
        │
Event Bus (central pub/sub)
        │
State Store (messages, streamingBuffer, agentStatus, steps[])
        │
Renderer (TUI – Ink)
        │
Agent runtime (optional: step FSM, tools)
        │
LLM (streaming API)
```

- **Event Bus:** Single source of events. No component talks to another directly; everything goes through the bus.
- **State Store:** Single source of truth. UI only renders state; state is updated only in response to events.
- **Renderer:** React (Ink). Renders state; subscribes to store updates and re-renders (Ink does diff-based terminal updates).

---

## 3. Event types

| Event | Payload | Who emits | Who consumes |
|-------|---------|-----------|--------------|
| `USER_MESSAGE` | `{ text }` | Input component | Agent runtime |
| `LLM_TOKEN` | `{ token }` | LLM stream | State store → UI |
| `LLM_DONE` | `{}` | LLM stream | State store |
| `AGENT_STATUS` | `{ status, message? }` | Agent runtime | State store → UI |
| `AGENT_STEP` | `{ type, status, message, id? }` | Agent runtime | State store → UI |
| `TOOL_START` | `{ tool, args? }` | Agent runtime | State store → UI |
| `TOOL_END` | `{ tool, result? }` | Agent runtime | State store → UI |
| `SPINNER_TICK` | `{}` | Timer (~80ms) | State store → UI |
| `KEY` | `{ key, ctrl, meta }` | Input | State store / commands |

---

## 4. State shape

```js
{
  messages: [ { role: 'user'|'assistant', content: string } ],
  streamingMessage: '',       // current incomplete assistant message
  agentStatus: 'idle'|'thinking'|'responding'|'tool_running',
  statusMessage: '',          // e.g. "Searching codebase..."
  steps: [                    // agent step timeline
    { id, type: 'thinking'|'tool_call'|'tool_result'|'response', status: 'running'|'complete', message: string }
  ],
  spinnerFrame: 0,
  inputBuffer: '',
  error: null
}
```

---

## 5. Agent step FSM (optional for v1, full for v2)

- **States:** `IDLE` → `PLANNING` → `THINKING` → `TOOL_CALL` → `TOOL_RUNNING` → `TOOL_RESULT` → `RESPONDING` → `DONE`.
- Each transition emits `AGENT_STATUS` and/or `AGENT_STEP`.
- UI renders `steps[]` as a timeline (e.g. 🧠 Planning → 🔍 Searching… → ✓ Found 3 files → ✍ Writing…).

---

## 6. Tech stack

| Layer | Choice | Reason |
|-------|--------|--------|
| TUI | **Ink** (React for CLI) | React model, diff rendering, components, same as desktop app mindset |
| Styling | **chalk** (or Ink's built-in) | Colors, bold, dim |
| Spinners | **cli-spinners** or custom frames | Ora-style frames; we drive via SPINNER_TICK |
| Input | **Ink TextInput** or **readline** | Depends on Ink version; Ink 4 has useInput |
| Event bus | **Custom (EventEmitter)** | Simple; no extra deps |
| State | **React useState + context** or **Zustand** | Single store; Ink re-renders on state change |
| LLM | **axios** or **fetch** (streaming) | Same as desktop; optional SSE/stream reader |

---

## 7. File structure (CLI in repo)

```
cli/
├── index.js              # Entry: parse args, create store/bus, render Ink app
├── core/
│   ├── eventBus.js       # EventEmitter wrapper; emit/on
│   └── stateStore.js     # State + setState; subscribes to eventBus, updates state
├── agent/
│   ├── runner.js         # runAgent(prompt): emits AGENT_STATUS, AGENT_STEP, LLM_TOKEN
│   ├── steps.js          # Step FSM helpers (optional)
│   └── llmStream.js      # Stream LLM API (Cyrex/OpenAI); emit LLM_TOKEN, LLM_DONE
├── ui/
│   ├── App.jsx           # Ink root: layout, subscribe to store
│   ├── MessageList.jsx   # Renders messages + streaming buffer
│   ├── StatusBar.jsx     # agentStatus + statusMessage + spinner
│   ├── StepTimeline.jsx   # steps[] as timeline (optional)
│   ├── PromptInput.jsx   # Input row; on submit emit USER_MESSAGE
│   └── Spinner.jsx       # Animated spinner using spinnerFrame
└── package.json          # (optional) if cli is a separate package; else use root deps)
```

The CLI can live in the same repo and use the root `package.json` (add `ink`, `chalk`, `cli-spinners`); entry script `cli/index.js` run via `node cli/index.js` or `npm run cli`.

---

## 8. Implementation phases

| Phase | What | Outcome |
|-------|------|--------|
| **1** | Event bus + state store + Ink app shell | Run `npm run cli`, see a static TUI (title + prompt input), typing and submit emit USER_MESSAGE |
| **2** | Message list + streaming buffer in state | After USER_MESSAGE, show "Thinking..." and append a fake streaming message (or real LLM stream) |
| **3** | Real LLM streaming | Connect to Cyrex/OpenAI streaming API; emit LLM_TOKEN/LLM_DONE; UI shows live tokens |
| **4** | Agent status + spinner | AGENT_STATUS + SPINNER_TICK; StatusBar shows status + spinner |
| **5** | Agent step timeline | Emit AGENT_STEP; render steps[] as timeline (Thinking → Tool → Result) |
| **6** | Tools (read_file, search) | Agent can call tools; TOOL_START/TOOL_END; optional FSM in runner |

---

## 9. The 7 components (production-style polish)

1. **Streaming tokens** – LLM stream → LLM_TOKEN events → append to `streamingMessage` → UI re-renders.
2. **Spinners** – Timer emits SPINNER_TICK; state has `spinnerFrame`; Spinner component uses frames (⠋⠙⠹⠸⠼⠴).
3. **Status messages** – AGENT_STATUS updates `statusMessage`; StatusBar shows it.
4. **Step timeline** – AGENT_STEP appends to `steps[]`; StepTimeline renders with icons (🧠🔍✓✍).
5. **Keyboard handling** – Ctrl+C exit, Ctrl+L clear; useInput (Ink) or raw mode readline.
6. **Diff rendering** – Handled by Ink; we only update React state.
7. **Input prompt** – Persistent input at bottom; submit on Enter; optional multi-line.

---

## 10. Run and scripts

- Add to root `package.json`: `"cli": "node cli/index.js"` (and optionally `"cli:dev": "node --watch cli/index.js"`).
- Usage: `npm run cli` or `npm run cli -- --help` (if we add commander later).

---

## 11. Diagram

```
User types in terminal
        │
        ▼
PromptInput (Ink) → emit USER_MESSAGE
        │
        ▼
Event Bus
        │
        ├──→ State Store (append message, set agentStatus = 'thinking')
        │
        └──→ Agent Runner
                    │
                    ├── emit AGENT_STATUS('thinking')
                    ├── emit AGENT_STEP(thinking)
                    ├── LLM stream → emit LLM_TOKEN(t) for each t
                    ├── emit LLM_DONE
                    └── emit AGENT_STEP(response, complete)
        │
State Store updates
        │
        ▼
Ink re-renders (MessageList, StatusBar, StepTimeline)
        │
        ▼
Terminal output (diffed)
```

---

## Implemented (Phase 1–2)

- **Event bus** (`cli/core/eventBus.js`) and **state store** schema (`cli/core/stateStore.js`).
- **Agent runner** (`cli/agent/runner.js`) subscribes to `USER_MESSAGE`, emits `AGENT_STATUS` / `AGENT_STEP`, and calls **LLM stream** (`cli/agent/llmStream.js`); stub stream emits fake tokens + `LLM_DONE`.
- **Ink UI**: `App.js`, `MessageList.js`, `StatusBar.js`, `StepTimeline.js`, `PromptInput.js`, `Spinner.js` (all plain JS with `React.createElement` so `node cli/index.js` works without a bundler).
- **Run:** `npm run cli` (must be in an **interactive terminal**; Ink requires a TTY for raw input).

---

## Implemented (Phases 1–6 + polish)

- Phases 1–3: Event bus, state, Ink UI, **real LLM streaming** (OpenAI, Ollama, Cyrex).
- Phase 4–5: Agent status, spinner, step timeline.
- Phase 6: **Tools** – read_file, search; TOOL_START/TOOL_END; runner parses "read file X" / "search for Y" and runs tools, then streams LLM with tool result as context.
- Polish: **Ctrl+L** clear screen; **--help** / **--version**; config from env and optional config file.
- **Desktop:** Opening a file from CLI (`emotion-desktop -- /path/to/file`) is wired: main sends `open-file-from-cli`, renderer subscribes via `api.onOpenFileFromCli` and opens the file in a tab.
