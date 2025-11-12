# Deepiri Desktop IDE - Architecture

## Tech Stack

### Frontend
- **React + TypeScript** - UI framework
- **Vite** - Build tool
- **Tauri** - Desktop runtime (Rust-based, smaller footprint)

### Backend (Local)
- **Rust** - Native microservices for model loading, embeddings
- **SQLite** - Local state storage
- **GGML/llama.cpp** - Local LLM inference (quantized)
- **ONNX Runtime** - Cross-platform inference

### Cloud Services (Optional)
- **Node.js/Go** - Backend microservices
- **OAuth2** - Authentication
- **CRDT (automerge)** - Conflict-free sync
- **WebSocket/WebRTC** - Real-time features

## Architecture Layers

### 1. Local Agent (Rust Process)
- Loads quantized models (7B GGML)
- Performs local inference
- Handles embeddings and caching
- Manages local storage

### 2. Frontend (React/Tauri)
- UI rendering
- Local storage management
- Plugin runtime
- Mission system

### 3. Cloud Microservices (Optional)
- Auth Service
- Sync Service (E2E encrypted)
- Integration Service (OAuth connectors)
- Model Orchestration (heavy runs)
- Analytics (privacy-respecting)

## Key Features

### Mission Cards
- Turn tasks into mini-games
- Explicit success criteria
- Real-time progress tracking
- Automatic reward distribution

### Plugin System
- Sandboxed JS/TS runtime
- Permission-based API
- Marketplace for extensions
- Code-signed plugins

### Local LLM
- 7B quantized model (GGML)
- CPU/GPU acceleration
- Privacy-first (no cloud)
- Hints and code completion

### Multiplayer
- Asynchronous challenges
- Leaderboards
- Session replays
- WebRTC for peer duels

## Privacy & Security

### Default: Local-Only
- All inference local
- No cloud sync by default
- Encrypted local storage

### Optional Cloud Sync
- End-to-end encryption
- User-controlled keys
- Opt-in telemetry
- Configurable data retention

## Integrations

### GitHub/GitLab
- Import issues → tasks → missions
- Code editor integration
- Test execution
- PR patching

### Notion/Trello
- Sync tasks
- Scheduled missions
- Calendar integration

### Calendar
- Schedule focus sprints
- Free block detection
- Time-based challenges

