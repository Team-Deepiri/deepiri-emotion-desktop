# Shared (src/shared)

Single source of truth for configuration and constants used by **main process** and **renderer**. Keeps both sides in sync and avoids duplication.

- **defaults.js** — `DEFAULT_AI_SETTINGS`, `DEFAULT_APP_SETTINGS`, `DEFAULT_TABS_SETTINGS`, `DEFAULT_INDEXING_SETTINGS`, `DEFAULT_TOOLS_SETTINGS`, `DEFAULT_SKIP_DIRS`. Used by main (e.g. indexing skip list) and re-exported by `renderer/config/defaults.js`.
- **constants.js** — `STORAGE_KEYS`, `MAX_RECENT_FOLDERS`, `MAX_RECENT_FILES`, `INDEXING_MAX_FILES`, `SEARCH_MAX_RESULTS`. Use these in main and renderer instead of defining your own.

**From main:** `import { DEFAULT_SKIP_DIRS } from './shared/defaults.js';` (paths relative to `src/`).

**From renderer:** Use Vite resolution; e.g. `import { STORAGE_KEYS } from '../../shared/constants.js';` or re-export via `renderer/constants` so existing imports keep working.
