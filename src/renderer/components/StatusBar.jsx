import React from 'react';

export default function StatusBar({
  cursorPosition,
  language,
  encoding = 'UTF-8',
  eol = 'LF',
  tabSize = 2,
  projectRoot,
  problemsCount = 0
}) {
  const line = cursorPosition?.lineNumber ?? '—';
  const col = cursorPosition?.column ?? '—';

  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="status-item" title="Line:Column">
          Ln {line}, Col {col}
        </span>
        <span className="status-item">{language || 'plaintext'}</span>
        <span className="status-item">Tab size: {tabSize}</span>
        <span className="status-item">{encoding}</span>
        <span className="status-item">{eol}</span>
        {projectRoot && (
          <span className="status-item" title={projectRoot}>
            📁 {projectRoot.split(/[/\\]/).pop() || projectRoot}
          </span>
        )}
      </div>
      <div className="status-right">
        {problemsCount > 0 && (
          <span className="status-item problems-badge">{problemsCount} problem(s)</span>
        )}
        <span className="status-item">Deepiri IDE</span>
      </div>
    </div>
  );
}
