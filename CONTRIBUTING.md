# Contributing to Deepiri Emotion Desktop

Thank you for considering contributing to Deepiri Emotion.

## Development setup

1. **Clone and install**

   ```bash
   git clone https://github.com/deepiri/deepiri-ide-desktop.git
   cd deepiri-ide-desktop
   npm install
   ```

2. **Run in development**

   ```bash
   # Terminal 1
   npm run dev:renderer

   # Terminal 2
   npm run dev
   ```

3. **Optional** — Copy `.env.example` to `.env` and set `API_URL`, `AI_SERVICE_URL`, etc., if you use the platform API or Cyrex.

4. **Run from source with a folder or file:** `npm run dev -- -- /path/to/folder` opens the app with that folder as the project root. `npm run dev -- -- /path/to/file` opens the app and opens that file in a tab. Arguments after `--` are passed to the app.

5. **Terminal CLI (optional):** `npm run cli` runs an interactive TUI (no Electron); requires a real TTY. Use `npm run cli -- /path/to/project` to run tools in that directory. See `cli/README.md`.

## Lint and test

Before submitting a PR, run:

```bash
npm run lint    # ESLint (fix with npm run lint:fix)
npm test        # Vitest unit tests
```

CI runs these plus `npm run build:renderer`. The full check is `npm run check` (lint + test + build renderer). Keep tests green and fix new lint errors (or prefix intentionally unused variables with `_`). Node tests (main process + CLI) run via `vitest run --config vitest.config.node.js`.

## Code and structure

- **Main process:** `src/main.js` (entry), `src/main/index.js` (orchestrator), `src/main/services/*.js` (IPC handlers). IPC channel names are in `src/shared/ipcChannels.js`; keep preload in sync (see [AGENTS.md](AGENTS.md)).
- **Renderer:** `src/renderer/` — React components in `components/`, feature modules in `features/`, shared state in `context/` and `hooks/`.
- **Styles:** `src/renderer/styles/` — Use existing CSS variables and layout classes where possible.
- **Formatting:** Use the project’s [.editorconfig](.editorconfig) (2 spaces, LF, trim trailing whitespace).
- **Local data:** User data is stored in the app data directory (see [docs/local-storage.md](docs/local-storage.md)): JSON files (AI settings, usage) and a SQLite DB (chat history) in the main process; `localStorage` in the renderer. No separate database server.

## Submitting changes

1. Create a branch from `main` (e.g. `fix/issue-123` or `feat/quick-open-improvements`).
2. Make your changes; keep commits focused and messages clear.
3. Run a production build to ensure nothing is broken: `npm run build:renderer` and (if you have Electron builder set up) `npm run build`.
4. Open a pull request with a short description of what changed and why. Link any related issues.

## Reporting issues

Use the [GitHub issue tracker](https://github.com/deepiri/deepiri-ide-desktop/issues). For security-sensitive issues, see [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the same [Apache License 2.0](LICENSE) that covers this project.
