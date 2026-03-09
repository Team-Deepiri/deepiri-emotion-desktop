/**
 * deepiri-emotion: Panel for emotional AI agents — select profile, see state, customize.
 */

import React, { useState, useEffect } from 'react';
import { useEmotion } from './EmotionContext.jsx';
import { PREDEFINED_AGENTS } from './predefinedAgents.js';
import { api } from '../../api';
import './emotion.css';

export default function EmotionPanel({ onOpenAIChat }) {
  const {
    profiles,
    activeAgentId,
    setActiveAgentId,
    addProfile,
    removeProfile,
    updateProfile,
    emotionalState,
    refreshEmotionalState,
    activeProfile
  } = useEmotion();
  const [showAdd, setShowAdd] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTrait, setNewTrait] = useState('');
  const [runtimeAgents, setRuntimeAgents] = useState([]);
  const [subagentName, setSubagentName] = useState('');
  const [subagentAdding, setSubagentAdding] = useState(false);

  const loadRuntimeAgents = () => {
    api.listAgents().then((list) => setRuntimeAgents(list || [])).catch(() => setRuntimeAgents([]));
  };

  useEffect(() => {
    loadRuntimeAgents();
  }, []);

  const handleRegisterSubagent = async () => {
    const name = (subagentName || '').trim();
    if (!name) return;
    setSubagentAdding(true);
    try {
      await api.registerAgent({ name, version: '1.0.0' });
      setSubagentName('');
      loadRuntimeAgents();
    } catch (e) {
      console.error(e);
    }
    setSubagentAdding(false);
  };

  const handleUnregisterSubagent = async (id) => {
    try {
      await api.unregisterAgent(id);
      loadRuntimeAgents();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    const id = addProfile({ name: newName.trim(), role: 'Partner', personality: ['supportive'], tone: 'warm', skills: [] });
    setActiveAgentId(id);
    setNewName('');
    setShowAdd(false);
  };

  const handleAddFromTemplate = (template) => {
    const { id: _id, builtIn: _b, createdAt: _c, ...rest } = template;
    const newId = addProfile({ ...rest, name: `${template.name} (copy)`, builtIn: false });
    setActiveAgentId(newId);
    setShowTemplate(false);
  };

  return (
    <div className="emotion-panel">
      <div className="emotion-panel-header">
        <h2>Emotion — deepiri-emotion</h2>
        <p className="emotion-subtitle">Your AI creative partner with personality</p>
      </div>

      <section className="emotion-section">
        <h3>Agents — pick one for specific helping</h3>
        <p className="emotion-section-hint">Built-in agents are tuned for code review, docs, refactoring, explaining, tests, security, and pair programming.</p>
        <div className="emotion-agent-cards">
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`emotion-agent-card ${activeAgentId === p.id ? 'active' : ''} ${p.builtIn ? 'emotion-agent-builtin' : ''}`}
              onClick={() => setActiveAgentId(p.id)}
            >
              <span className="emotion-agent-name">{p.name}</span>
              <span className="emotion-agent-role">{p.role || 'Partner'}</span>
              {p.builtIn && <span className="emotion-agent-badge" title="Predefined agent">●</span>}
              {!p.builtIn && p.id !== 'default' && (
                <button
                  type="button"
                  className="emotion-agent-remove"
                  onClick={(e) => { e.stopPropagation(); removeProfile(p.id); }}
                  aria-label="Remove agent"
                >
                  ×
                </button>
              )}
            </button>
          ))}
        </div>
        {showAdd ? (
          <div className="emotion-add-form">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Agent name"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
            <button type="button" onClick={handleAdd}>Add</button>
            <button type="button" onClick={() => { setShowAdd(false); setNewName(''); }}>Cancel</button>
          </div>
        ) : (
          <div className="emotion-add-actions">
            <button type="button" className="emotion-btn-secondary" onClick={() => setShowAdd(true)}>
              + New agent
            </button>
            <button type="button" className="emotion-btn-secondary" onClick={() => setShowTemplate((t) => !t)}>
              Add from template
            </button>
          </div>
        )}
        {showTemplate && (
          <div className="emotion-template-list">
            {PREDEFINED_AGENTS.map((t) => (
              <button key={t.id} type="button" className="emotion-template-item" onClick={() => handleAddFromTemplate(t)}>
                <span className="emotion-agent-name">{t.name}</span>
                <span className="emotion-agent-role">{t.role}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {activeProfile && (
        <section className="emotion-section">
          <h3>Edit personality</h3>
          <div className="emotion-prop-row">
            <label>Tone</label>
            <select
              value={activeProfile.tone || 'neutral'}
              onChange={(e) => updateProfile(activeProfile.id, { tone: e.target.value })}
            >
              <option value="neutral">neutral</option>
              <option value="warm">warm</option>
              <option value="playful">playful</option>
              <option value="professional">professional</option>
              <option value="encouraging">encouraging</option>
            </select>
          </div>
          <div className="emotion-prop-row">
            <label>Traits</label>
            <div className="emotion-traits">
              {(activeProfile.personality || []).map((t) => (
                <span key={t} className="emotion-tag">
                  {t}
                  <button type="button" className="emotion-tag-remove" onClick={() => updateProfile(activeProfile.id, { personality: (activeProfile.personality || []).filter((x) => x !== t) })}>×</button>
                </span>
              ))}
              <div className="emotion-trait-add">
                <input type="text" value={newTrait} onChange={(e) => setNewTrait(e.target.value)} placeholder="Add trait" onKeyDown={(e) => e.key === 'Enter' && (updateProfile(activeProfile.id, { personality: [...(activeProfile.personality || []), newTrait.trim()].filter(Boolean) }), setNewTrait(''))} />
                <button type="button" onClick={() => { updateProfile(activeProfile.id, { personality: [...(activeProfile.personality || []), newTrait.trim()].filter(Boolean) }); setNewTrait(''); }}>Add</button>
              </div>
            </div>
          </div>
          <div className="emotion-prop-row">
            <label>System prompt (optional)</label>
            <textarea
              value={activeProfile.systemPrompt || ''}
              onChange={(e) => updateProfile(activeProfile.id, { systemPrompt: e.target.value })}
              placeholder="Custom instructions for this agent..."
              rows={3}
              className="emotion-system-prompt"
            />
          </div>
        </section>
      )}

      <section className="emotion-section">
        <h3>Runtime subagents</h3>
        <p className="emotion-section-hint">In-process agents on the Fabric bus. Register subagents for specialized tasks.</p>
        <ul className="emotion-runtime-agents">
          {runtimeAgents.map((a) => (
            <li key={a.id} className="emotion-runtime-agent">
              <span className="emotion-runtime-agent-name">{a.name}</span>
              <span className="emotion-runtime-agent-version">v{a.version}</span>
              {a.name !== 'ide' && (
                <button type="button" className="emotion-agent-remove" onClick={() => handleUnregisterSubagent(a.id)} title="Unregister">×</button>
              )}
            </li>
          ))}
        </ul>
        <div className="emotion-add-actions">
          <input
            type="text"
            value={subagentName}
            onChange={(e) => setSubagentName(e.target.value)}
            placeholder="Subagent name"
            onKeyDown={(e) => e.key === 'Enter' && handleRegisterSubagent()}
          />
          <button type="button" className="emotion-btn-secondary" onClick={handleRegisterSubagent} disabled={subagentAdding || !subagentName?.trim()}>
            Register subagent
          </button>
        </div>
      </section>

      <section className="emotion-section">
        <h3>Emotional context</h3>
        <div className="emotion-state">
          <span>Valence: {emotionalState.valence}</span>
          <span>Energy: {emotionalState.energy}</span>
          <span>Focus: {emotionalState.focus}</span>
        </div>
        <button type="button" className="emotion-btn-secondary" onClick={refreshEmotionalState}>Refresh</button>
        <p className="emotion-hint">Updated from chat. AI uses this to adapt tone.</p>
      </section>

      {onOpenAIChat && (
        <div className="emotion-actions">
          <button type="button" className="emotion-btn-primary" onClick={onOpenAIChat}>
            Open AI Chat with {activeProfile?.name || 'agent'}
          </button>
        </div>
      )}
    </div>
  );
}
