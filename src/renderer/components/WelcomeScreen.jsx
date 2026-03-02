import React from 'react';

/**
 * Cursor-style welcome: recent folders, quick actions, getting started.
 */
export default function WelcomeScreen({
  onOpenFolder,
  onNewFile,
  onCommandPalette,
  onQuickOpen,
  recentFolders = [],
  onOpenRecentFolder
}) {
  return (
    <div className="welcome-screen-full">
      <div className="welcome-brand">
        <h1>Deepiri IDE</h1>
        <p className="welcome-tagline">AI-powered productivity IDE with Cyrex & Helox</p>
      </div>

      <div className="welcome-sections">
        <section className="welcome-section">
          <h2>Start</h2>
          <div className="welcome-actions">
            <button type="button" className="welcome-btn primary" onClick={onOpenFolder}>
              Open Folder
            </button>
            <button type="button" className="welcome-btn" onClick={onNewFile}>
              New File
            </button>
            <button type="button" className="welcome-btn" onClick={onQuickOpen}>
              Go to File… (Ctrl+P)
            </button>
            <button type="button" className="welcome-btn" onClick={onCommandPalette}>
              Command Palette (Ctrl+Shift+P)
            </button>
          </div>
        </section>

        {recentFolders.length > 0 && (
          <section className="welcome-section">
            <h2>Recent</h2>
            <ul className="welcome-recent-list">
              {recentFolders.slice(0, 5).map((path) => (
                <li key={path}>
                  <button type="button" className="welcome-recent-item" onClick={() => onOpenRecentFolder(path)}>
                    {path.split(/[/\\]/).filter(Boolean).pop() || path}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="welcome-section">
          <h2>Features</h2>
          <ul className="welcome-features">
            <li>Monaco editor with syntax highlighting</li>
            <li>AI Chat (context-aware, apply edits)</li>
            <li>Cyrex AI: Agent Playground, RAG, Workflows</li>
            <li>Helox training pipelines</li>
            <li>Tasks, challenges, gamification</li>
            <li>Terminal, search, problems panel</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
