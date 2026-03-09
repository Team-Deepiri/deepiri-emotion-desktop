# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Main process split into bootstrap + services (Phase A): `src/main/index.js`, `src/main/bootstrap-env.js`, `src/main/bootstrap-args.js`, `src/main/services/*.js` (workspace, file, terminal, AI, agent, platform, Helox, shell, extensions, integration, dbService).
- Single source of IPC channel names: `src/shared/ipcChannels.js` (Phase B).
- AGENTS.md and `.vscode/launch.json` / `tasks.json` for contributors and AI agents (Phase C).
- Built-in extensions in `extensions/` with manifest scanner; Extensions panel loads list from main process (Phase D).
- CLI: open folder (and optional file) via `electron . -- /path/to/folder` (Phase E).
- Main process unit test for workspaceService (Phase G).
- Main process global error handlers for uncaughtException and unhandledRejection (Phase H).
- This CHANGELOG (Phase Y).
- **Interactive Terminal CLI** (`npm run cli`): TUI with Ink, event bus, real LLM streaming (OpenAI, Ollama, Cyrex), config from env and optional config file, tools (read_file, search, run_command), error display, Ctrl+L clear, `--help`/`--version`, workspace-from-args (`npm run cli -- /path/to/project`), `npm run cli:dev` watch mode, multi-line input (Shift+Enter). Tests in `cli/agent/__tests__/tools.test.node.js`; Run CLI launch config in `.vscode/launch.json`.
- **Open file from CLI:** When the app is launched with a file path (`electron . -- /path/to/file`), the renderer opens that file in a tab via `onOpenFileFromCli`.
- **project-root-changed event:** When the app is launched with a folder, the main process sends `project-root-changed` so the renderer can set project root and refresh the workspace.
- **Local SQLite database:** sql.js in the main process; `userData/app.db` with `chat_messages` table. IPC: getChatHistory, appendChatMessage, clearChatHistory. AI Chat panel loads and persists chat history per session (project root or default); "Clear history" button in chat header.
- **docs/local-storage.md:** Documents where user data is stored (userData + JSON, localStorage, SQLite), and when to add more DB usage.

### Changed

- `src/main.js` is now a thin entry point; all IPC and window logic moved to `src/main/`.
- CONTRIBUTING.md updated with CLI run instructions, run with file, Terminal CLI section, local data reference, and Node test note.
- docs/architecture.md updated to describe the new main process layout and link to local-storage.md.
- AGENTS.md updated with CLI section, dbService and extensionsService in structure, local data and docs links.
- Lint now includes `cli/` (ESLint runs over `src` and `cli`).

## [1.0.0] - (previous releases)

Initial release; see git history for earlier changes.
