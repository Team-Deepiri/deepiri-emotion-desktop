import React, { useState, useRef, useEffect } from 'react';

const Terminal = ({ onCommand }) => {
  const [history, setHistory] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const inputRef = useRef(null);
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentInput.trim()) return;

    const command = currentInput.trim();
    setHistory(prev => [...prev, { type: 'input', content: command }]);
    
    if (onCommand) {
      onCommand(command);
    } else {
      setHistory(prev => [...prev, { type: 'output', content: `Command: ${command}` }]);
    }

    setCurrentInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Navigate history
    }
  };

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <span>Terminal</span>
        <button onClick={() => setHistory([])}>Clear</button>
      </div>
      <div className="terminal-output" ref={terminalRef}>
        {history.map((item, idx) => (
          <div key={idx} className={`terminal-line ${item.type}`}>
            {item.type === 'input' && <span className="prompt">$ </span>}
            <span>{item.content}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="terminal-input-form">
        <span className="prompt">$ </span>
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="terminal-input"
          placeholder="Enter command..."
        />
      </form>
    </div>
  );
};

export default Terminal;

