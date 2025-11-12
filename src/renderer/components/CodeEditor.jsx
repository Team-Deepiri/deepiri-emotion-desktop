import React, { useEffect, useRef, useState } from 'react';

const CodeEditor = ({ content, language = 'javascript', onChange, onSave }) => {
  const editorRef = useRef(null);
  const [lineNumbers, setLineNumbers] = useState([1]);

  useEffect(() => {
    if (editorRef.current) {
      const lines = content.split('\n').length;
      setLineNumbers(Array.from({ length: lines }, (_, i) => i + 1));
    }
  }, [content]);

  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's') {
        e.preventDefault();
        if (onSave) {
          onSave();
        }
      }
    }
  };

  return (
    <div className="code-editor-container">
      <div className="code-editor-header">
        <span className="editor-language">{language}</span>
        <button className="save-btn" onClick={onSave}>Save</button>
      </div>
      <div className="code-editor-wrapper">
        <div className="line-numbers">
          {lineNumbers.map(num => (
            <div key={num} className="line-number">{num}</div>
          ))}
        </div>
        <textarea
          ref={editorRef}
          className="code-editor"
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          placeholder="Start coding..."
        />
      </div>
    </div>
  );
};

export default CodeEditor;

