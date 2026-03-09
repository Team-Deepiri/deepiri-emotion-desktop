# Deepiri Emotion Desktop — Documentation

| Document | Description |
|----------|-------------|
| **[setup.md](setup.md)** | Full setup guide: prerequisites, clone, dev run, build, optional backends, env, verify. |
| **[install.md](install.md)** | How to get installers (.exe, .deb, .AppImage, .dmg, .pkg), dev setup, first-run, optional backends, Terminal CLI. |
| **[architecture.md](architecture.md)** | Tech stack (Electron, React, Vite, Monaco), main vs renderer, optional services, local data, security and packaging. |
| **[local-storage.md](local-storage.md)** | Where user data is stored (userData, JSON, localStorage, SQLite); when to add a database. |
| **[cli-tui-plan.md](cli-tui-plan.md)** | Terminal CLI TUI: architecture, events, state, implementation phases. |
| **[refactoring.md](refactoring.md)** | Refactoring plan: full merger of Cyrex UI and Helox pipelines into the desktop IDE. |

**Development:** Run `npm run lint` and `npm test` before committing. Full check: `npm run check` (lint + test + build renderer). CI runs these on push/PR.

**For contributors and AI agents:** See [AGENTS.md](../AGENTS.md) and [CONTRIBUTING.md](../CONTRIBUTING.md). Quick start and project overview: [root README](../README.md).
