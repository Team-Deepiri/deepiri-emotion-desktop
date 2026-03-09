# Deepiri Emotion Desktop — Architecture

High-level architecture of the desktop application and how it fits into the Deepiri platform.

---

## Tech stack (actual)

### Desktop & UI

| Layer | Technology | Role |
|-------|------------|------|
| **Desktop runtime** | Electron 28 | Main process, window management, IPC, native menus |
| **Renderer** | React 18 (JSX) | UI components, state, routing (single-page) |
| **Build** | Vite 5 | Dev server (HMR), production bundle for renderer |
| **Editor** | Monaco Editor (@monaco-editor/react) | Code editing, syntax highlighting, themes |

### Shared and main process (Node.js)

- **Shared:** `src/shared/` — `defaults.js` (DEFAULT_AI_SETTINGS, DEFAULT_APP_SETTINGS, DEFAULT_SKIP_DIRS, etc.) and `constants.js` (STORAGE_KEYS, limits). Single source for main and renderer; renderer config re-exports from shared.
- **Indexing:** `src/indexing.js` — workspace listing and exclude patterns: `listWorkspaceFiles(rootDir, excludePatterns)`, `parseExcludePatterns(patterns)`. Used by main process IPC so indexing rules live in one place.
- **Main entry:** `src/main.js`
- **Responsibilities:** Window lifecycle, IPC handlers (file system, shell, API proxy, AI/Cyrex/Helox), agent runtime (Fabric bus), neural memory, multi-terminal shell processes. File/workspace handlers delegate to `indexing.js` and use shared defaults where applicable.
- **Preload:** `src/preload.js` — exposes a controlled `window.electronAPI` to the renderer; when `window.__TAURI__` is set, many methods call Tauri `invoke` for parity when running as Tauri.

### Renderer (React)

- **Entry:** `src/renderer/main.jsx` → `App.jsx`
- **Structure:** `components/`, `features/`, `context/`, `hooks/`, `services/`, `api/`, `styles/`, `integrations/`.
- **State:** React state + context (Theme, Notifications, Emotion); no global store (Redux) by default.
- **API layer:** `src/renderer/api/` — `getElectronAPI()`, `api` (null-safe facade), `ENDPOINTS`. Use `api.runCommand()`, `api.getAiSettings()`, etc. instead of `window.electronAPI` for consistent error handling and when API is missing.

---

## Architecture layers

### 1. Main process (Electron)

- Creates `BrowserWindow`, loads renderer (dev: Vite URL; prod: `dist-renderer/index.html`).
- **IPC:** `list-directory`, `create-file`, `create-folder`, `delete-path`, `rename-path`, `get-project-root`, `open-project`, `open-file`, `save-file`, `run-command` (per-terminal), `cancel-command`, `list-agents`, `register-agent`, `unregister-agent`, `api-request`, `ai-request`, `get-ai-settings`, `set-ai-settings`, `chat-completion`, Helox pipeline run, Fabric bus, neural memory, etc.
- **Multi-terminal:** Shell processes keyed by `terminalId`; output/exit events include `terminalId` so the renderer can route to the correct tab.
- **Subagents:** Agent runtime (`agentRuntime.js`) supports `registerAgent`, `unregisterAgent`, `listAgents`; exposed via IPC for the Emotion panel.
- No direct DOM access; all file/shell access goes through main.

### 2. Renderer (React)

- **Activity bar + sidebar:** Explorer (workspace tree), Tasks, Challenges, Gamification, Integrations, Cyrex, Pipelines, Search, Outline, Keybindings, Extensions, API & Models, Emotion (agents + runtime subagents).
- **Editor area:** Tabs (with settings: full path, double-click to close, confirm unsaved), Monaco editor, breadcrumbs; optional Cyrex embed, Pipelines view, Search panel, Visual canvas.
- **Bottom panel:** Terminal (multiple tabs, + to add), Output, Debug Console, Ports, Problems, Fine-tune, **Tools** (run_command, read_file; registry for AI/automation).
- **Overlays:** Command palette (Ctrl+Shift+P), Quick Open (Ctrl+P), Notifications, Diff view, Create launcher (Ctrl+Shift+N).
- **Hooks:** Lifecycle hooks (beforeSave, afterSave, afterOpen, beforeClose) via `hooksRegistry`; App calls them on save/open. Register in code; Settings documents the API.

### 3. Optional backend services

- **Platform API** (`API_URL`): Tasks, sessions, gamification.
- **Cyrex AI** (`AI_SERVICE_URL`): Classification, challenges, RAG, chat completion, agents.
- **Cyrex UI** (`CYREX_INTERFACE_URL`): Embedded iframe in Cyrex tab.
- **Helox** (`HELOX_PATH`): Training pipelines run via main process (subprocess/scripts).

---

## Key features (implemented)

- **Workspace:** Open folder → real file tree; create/rename/delete files and folders; open files in tabs; Workspace view lists files with refresh; indexing settings (index on open, exclude patterns).
- **Monaco editor:** Syntax highlighting, themes (ThemeContext), save (Ctrl+S), cursor/selection for AI context, go to line/symbol.
- **AI:** Context-aware chat (current file + selection), “Apply to file”, diff view; **model selection** shown in chat header (from Settings → AI Provider); Emotion agents (predefined + custom) with system prompts.
- **Multi-terminal:** Terminal panel with tabs; add/close terminals; each has its own output and input; Run/Preview use default terminal.
- **Subagents:** Emotion panel → Runtime subagents: list/register/unregister in-process agents (Fabric bus).
- **Tools:** Registry (`toolsRegistry.js`) with built-ins (run_command, read_file); Tools panel in bottom panel; invokable from UI or for future AI function calling.
- **Hooks:** `hooksRegistry` with beforeSave, afterSave, afterOpen, beforeClose; App runs them; Settings → Hooks documents usage.
- **Quick Open / Command palette:** Ctrl+P file picker, Ctrl+Shift+P commands (including Open Tools panel).
- **Welcome:** Recent folders/files, quick actions, rotating tips (terminals, subagents, tools, hooks, model).
- **Settings:** Account, Agents, Tabs, Networking, Indexing & Docs, Tools, Hooks; saved to storage; settings-saved event so tabs/theme apply without restart.
- **Cyrex & Helox:** Tabs and IPC to backend/pipelines; optional services.

---

## Tauri backend (src-tauri)

When the app is built with Tauri, the same renderer can run against a Rust backend. Backend logic lives in `src-tauri/src/`:

- **Commands:** Tasks, gamification, LLM hints, session (start, record_keystroke, record_file_change, end_session), api_request.
- **File system:** `file_system.rs` — open_file, save_file, list_directory, list_workspace_files (with exclude patterns), create_file, create_folder.
- **Project & config:** get_project_root, set_project_root (AppState); get_ai_settings, set_ai_settings (JSON in app data dir).
- **Session:** SessionRecorder records keystrokes and file changes; record_file_change is exposed as a command.

The preload branches on `window.__TAURI__` and calls the corresponding Tauri invoke handlers for project, file, config, and session so the renderer API stays the same for both Electron and Tauri.

---

## Security and packaging

- **Context isolation:** Preload script only exposes whitelisted API; no `nodeIntegration` in renderer.
- **Build:** `electron-builder` produces installers (NSIS, DMG/PKG, deb/AppImage); `dist-renderer/` is generated by Vite and included in the app package.

---

## Docs

- **[Install & setup](install.md)** — Build installers, dev setup, optional backends.
- **[Refactoring plan](refactoring.md)** — Merger plan for Cyrex UI and Helox integration.
