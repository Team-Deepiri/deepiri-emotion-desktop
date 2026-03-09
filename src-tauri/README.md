# Tauri backend

Rust backend for Deepiri Emotion when built with Tauri. Keeps file, project, config, and session logic on the native side so the renderer stays thin.

## Layout

- **main.rs** — App setup, `AppState` (db, gamification, integrations, llm, recorder, project_root, config_path), invoke handler registration.
- **commands.rs** — Tasks, gamification, LLM (get_llm_hint, complete_code), session (start, record_keystroke, record_file_change, end_session), api_request, get/set project_root, get/set AI settings (JSON in app data dir).
- **file_system.rs** — open_file, save_file, list_directory, list_workspace_files (with exclude patterns), create_file, create_folder.
- **session_recorder.rs** — In-memory session and event buffer; keystrokes and file changes.
- **gamification.rs**, **integrations.rs**, **local_llm.rs** — Gamification engine, GitHub integration, local LLM hints.

The preload (or renderer) branches on `window.__TAURI__` and calls these commands via `invoke()` so the same UI works for both Electron and Tauri.
