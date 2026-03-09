# Local storage and user data

How the desktop app stores user data **without** a separate database, and when you might add one.

---

## Do we need a database?

**No.** For the current app, local data is stored with:

1. **JSON files** in the main process (Electron `userData` directory).
2. **localStorage** in the renderer (Chromium’s persistent key-value store, also under `userData`).

This is a common pattern for desktop apps: small, simple datasets (settings, recents, usage) don’t require SQL or a dedicated DB. You add a **local database** (e.g. SQLite) when you need queries, relations, migrations, or much larger structured data.

---

## Where does data actually live?

Electron uses a **user data directory** per app, created by the OS. All of the app’s persistent local data goes under this folder.

| OS      | Typical path |
|--------|------------------------------------------|
| macOS  | `~/Library/Application Support/deepiri-emotion-desktop` |
| Windows| `%APPDATA%/deepiri-emotion-desktop` |
| Linux  | `~/.config/deepiri-emotion-desktop` (or `$XDG_CONFIG_HOME`) |

In code you get it with **`app.getPath('userData')`** (main process only). The renderer never sees this path; it uses `localStorage`, which Chromium stores under that same directory.

---

## What is stored where

### Main process (Node) — JSON files in `userData`

These are plain files read/written with `fs.readFile` / `fs.writeFile` in `src/main/services/aiService.js`:

| File | Purpose |
|------|--------|
| `ai-settings.json` | AI provider (OpenAI/Cyrex/Ollama), API keys, model names |
| `api-usage.json` | Daily usage and recent request timestamps (for rate limits) |
| `usage-limits.json` | Rate and daily limits (requests/minute, daily requests/tokens) |

Paths are built as:

```js
const AI_SETTINGS_PATH = join(app.getPath('userData'), 'ai-settings.json');
```

So everything stays inside the app’s userData folder. No database process, no extra port.

### Renderer (browser context) — localStorage

The renderer uses the **Web Storage API** (`localStorage`). Electron backs this with files under the same userData directory (Chromium’s implementation). Keys are defined in **`src/shared/constants.js`** and used via **`src/renderer/utils/storage.js`** (`getJSON`, `setItem`, `removeItem`):

| Key (`STORAGE_KEYS`) | Purpose |
|----------------------|--------|
| `deepiri_settings` | App settings (e.g. tabs behavior) |
| `deepiri_theme` | Light/dark theme |
| `deepiri_editor_font_size` | Editor font size |
| `deepiri_sidebar_width` | Sidebar width |
| `deepiri_sidebar_collapsed` | Sidebar collapsed state |
| `deepiri_panel_height` | Bottom panel height |
| `deepiri_recent_folders` | Recent project folders (max 10) |
| `deepiri_recent_files` | Recent files (max 20) |
| `user_id` | Session/user id |

Other features use their own keys (e.g. Emotion profiles, visual editor state, plugin storage, notion/github tokens) but still via `localStorage` in the renderer.

---

## Summary

- **Main process:** Sensitive or main-only data (AI keys, usage) → **JSON files** in `app.getPath('userData')`.
- **Renderer:** UI state, recents, theme, layout → **localStorage** (backed by Chromium under the same userData).
- **No DB required** for current use: simple key-value and a few JSON blobs are enough.

---

## Local SQLite database (implemented)

The app includes a **local SQLite** database (via **sql.js**, in the main process only) for structured data that benefits from queries and persistence.

- **DB file:** `userData/app.db` (same directory as the JSON files above).
- **Service:** `src/main/services/dbService.js` — opens/creates the DB on first use, runs migrations (e.g. `chat_messages` table), exposes IPC handlers.
- **IPC channels:** `db-get-chat-history`, `db-append-chat-message`, `db-clear-chat-history` (see `src/shared/ipcChannels.js`).
- **Renderer API:** `api.getChatHistory(sessionId, limit)`, `api.appendChatMessage({ role, content, sessionId })`, `api.clearChatHistory(sessionId)`.

**Chat history:** AI Chat loads the last 50 messages for the current “session” (project root or `default`) from the DB on open, appends each user/assistant message after send, and offers “Clear history” to delete that session’s history. So you don’t need a separate DB server—it’s a single file on disk and the main process runs all SQL.

---

## When would we add more DB usage?

Add a **local database** (usually **SQLite**) when you need:

- **Structured queries** (filter, sort, join) over many records.
- **Relations** (e.g. tasks ↔ tags ↔ projects).
- **Migrations** (schema changes over time).
- **Large or growing data** (e.g. full chat history, audit logs) where one big JSON file is awkward.

### How desktop apps usually add a local DB

1. **SQLite** (e.g. `better-sqlite3` or `sql.js`):
   - Single file, e.g. `join(app.getPath('userData'), 'app.db')`.
   - No separate server; the main process opens the file and runs SQL.
   - Good for relational data, indexes, and migrations.

2. **LevelDB / key-value** (e.g. `level`):
   - Good for very high write throughput or simple key-value with range scans.
   - Less common than SQLite when you have clear structure.

3. **Where it runs:**
   - **Main process only.** Open the DB in the main process; expose methods via IPC (e.g. `getHistory`, `insertChat`). The renderer never touches the DB file directly.

### Example (conceptual)

```js
// main process
import Database from 'better-sqlite3';
const dbPath = join(app.getPath('userData'), 'history.db');
const db = new Database(dbPath);
ipcMain.handle('get-chat-history', () => db.prepare('SELECT * FROM chats').all());
```

Then in the renderer you’d call `api.getChatHistory()` (which uses that IPC). No DB in the renderer, no extra “database server”—just one file on disk and the main process.

---

## References in code

- **userData + JSON paths:** `src/main/services/aiService.js` (top of file).
- **Storage keys:** `src/shared/constants.js` (`STORAGE_KEYS`, limits).
- **Renderer storage helpers:** `src/renderer/utils/storage.js`, `src/renderer/constants/storageKeys.js`.
- **Usage:** Settings, ThemeContext, recentService, layoutService, emotionService, etc. all use the same keys and helpers.
