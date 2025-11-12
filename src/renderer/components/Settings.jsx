import React, { useState, useEffect } from 'react';

const Settings = () => {
  const [settings, setSettings] = useState({
    apiUrl: 'http://localhost:5000/api',
    aiServiceUrl: 'http://localhost:8000',
    localLLM: false,
    modelPath: '',
    theme: 'dark',
    autoSave: true,
    fontSize: 14
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const saved = localStorage.getItem('deepiri_settings');
    if (saved) {
      setSettings({ ...settings, ...JSON.parse(saved) });
    }
  };

  const saveSettings = () => {
    localStorage.setItem('deepiri_settings', JSON.stringify(settings));
    alert('Settings saved!');
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Settings</h2>
        <button onClick={saveSettings} className="btn-primary">Save</button>
      </div>
      <div className="settings-content">
        <div className="settings-section">
          <h3>API Configuration</h3>
          <div className="setting-item">
            <label>Backend API URL</label>
            <input
              type="text"
              value={settings.apiUrl}
              onChange={(e) => handleChange('apiUrl', e.target.value)}
            />
          </div>
          <div className="setting-item">
            <label>AI Service URL</label>
            <input
              type="text"
              value={settings.aiServiceUrl}
              onChange={(e) => handleChange('aiServiceUrl', e.target.value)}
            />
          </div>
        </div>

        <div className="settings-section">
          <h3>Local LLM</h3>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.localLLM}
                onChange={(e) => handleChange('localLLM', e.target.checked)}
              />
              Enable Local LLM
            </label>
          </div>
          {settings.localLLM && (
            <div className="setting-item">
              <label>Model Path</label>
              <input
                type="text"
                value={settings.modelPath}
                onChange={(e) => handleChange('modelPath', e.target.value)}
                placeholder="/path/to/model.ggml"
              />
            </div>
          )}
        </div>

        <div className="settings-section">
          <h3>Editor</h3>
          <div className="setting-item">
            <label>Font Size</label>
            <input
              type="number"
              value={settings.fontSize}
              onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
              min="10"
              max="24"
            />
          </div>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) => handleChange('autoSave', e.target.checked)}
              />
              Auto Save
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h3>Theme</h3>
          <div className="setting-item">
            <label>Theme</label>
            <select value={settings.theme} onChange={(e) => handleChange('theme', e.target.value)}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

