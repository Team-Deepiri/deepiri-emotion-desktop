import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_AI_SETTINGS,
  DEFAULT_ACCOUNT_SETTINGS,
  DEFAULT_TABS_SETTINGS,
  DEFAULT_NETWORKING_SETTINGS,
  DEFAULT_INDEXING_SETTINGS,
  DEFAULT_TOOLS_SETTINGS
} from '../config';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getJSON, setItem } from '../utils/storage';
import { SETTINGS_SECTIONS } from '../features/settings/constants';

const PROVIDERS = [
  { value: 'cyrex', label: 'Cyrex / Runtime (diri-cyrex)' },
  { value: 'openai', label: 'OpenAI (GPT)' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'google', label: 'Google (Gemini)' },
  { value: 'local', label: 'Local (Ollama or Cyrex runtime)' }
];

const Settings = () => {
  const { theme, setTheme, editorFontSize, setEditorFontSize } = useTheme();
  const { success } = useNotifications();
  const [settings, setSettings] = useState(DEFAULT_APP_SETTINGS);
  const [aiSettings, setAiSettings] = useState(DEFAULT_AI_SETTINGS);
  const [account, setAccount] = useState(DEFAULT_ACCOUNT_SETTINGS);
  const [tabsSettings, setTabsSettings] = useState(DEFAULT_TABS_SETTINGS);
  const [networking, setNetworking] = useState(DEFAULT_NETWORKING_SETTINGS);
  const [indexing, setIndexing] = useState(DEFAULT_INDEXING_SETTINGS);
  const [tools, setTools] = useState(DEFAULT_TOOLS_SETTINGS);

  useEffect(() => {
    setSettings(prev => ({ ...prev, theme: theme || 'dark', fontSize: editorFontSize ?? 14 }));
  }, [theme, editorFontSize]);

  useEffect(() => {
    const parsed = getJSON(STORAGE_KEYS.SETTINGS);
    if (parsed && typeof parsed === 'object') {
      const { apiUrl, aiServiceUrl, theme: t, autoSave, fontSize } = parsed;
      setSettings(prev => ({ ...prev, apiUrl, aiServiceUrl, theme: t ?? prev.theme, autoSave, fontSize }));
      if (parsed.account) setAccount(() => ({ ...DEFAULT_ACCOUNT_SETTINGS, ...parsed.account }));
      if (parsed.tabs) setTabsSettings(() => ({ ...DEFAULT_TABS_SETTINGS, ...parsed.tabs }));
      if (parsed.networking) setNetworking(() => ({ ...DEFAULT_NETWORKING_SETTINGS, ...parsed.networking }));
      if (parsed.indexing) setIndexing(() => ({ ...DEFAULT_INDEXING_SETTINGS, ...parsed.indexing }));
      if (parsed.tools) setTools(() => ({ ...DEFAULT_TOOLS_SETTINGS, ...parsed.tools }));
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI?.getConfig) {
      window.electronAPI.getConfig().then((cfg) => {
        if (cfg) {
          setSettings(prev => ({
            ...prev,
            apiUrl: cfg.apiBaseUrl || prev.apiUrl,
            aiServiceUrl: cfg.aiServiceUrl || prev.aiServiceUrl
          }));
        }
      });
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI?.getAiSettings) {
      window.electronAPI.getAiSettings().then((s) => {
        if (s) setAiSettings(prev => ({ ...prev, ...s }));
      });
    }
  }, []);

  const saveSettings = async () => {
    const toSave = {
      ...settings,
      account,
      tabs: tabsSettings,
      networking,
      indexing,
      tools
    };
    setItem(STORAGE_KEYS.SETTINGS, toSave);
    setTheme(settings.theme);
    setEditorFontSize(settings.fontSize);
    if (window.electronAPI?.setAiSettings) {
      await window.electronAPI.setAiSettings(aiSettings);
    }
    if (typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('settings-saved', { detail: toSave }));
    }
    success('Settings saved.');
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleAiChange = (key, value) => {
    setAiSettings(prev => ({ ...prev, [key]: value }));
  };

  const [settingsSearch, setSettingsSearch] = useState('');
  const q = settingsSearch.trim().toLowerCase();
  const match = (...keywords) => !q || keywords.some((k) => k.toLowerCase().includes(q));

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Settings</h2>
        <button type="button" onClick={saveSettings} className="btn-primary">Save</button>
      </div>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {SETTINGS_SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className="settings-nav-item"
              onClick={() => scrollToSection(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="settings-main">
          <div className="settings-search-row">
            <input
              type="text"
              className="settings-search-input"
              placeholder="Search settings…"
              value={settingsSearch}
              onChange={(e) => setSettingsSearch(e.target.value)}
              aria-label="Search settings"
            />
          </div>
          <div className="settings-content">
        {match('account', 'profile', 'email', 'manage') && (
        <div className="settings-section" id="settings-section-account">
          <h3>Account</h3>
          <p className="settings-hint">Manage your account and profile. Sign-in can be wired to your backend.</p>
          <div className="setting-item">
            <label>Display name</label>
            <input
              type="text"
              value={account.displayName}
              onChange={(e) => setAccount(prev => ({ ...prev, displayName: e.target.value }))}
              placeholder="Your name"
            />
          </div>
          <div className="setting-item">
            <label>Email</label>
            <input
              type="email"
              value={account.email}
              onChange={(e) => setAccount(prev => ({ ...prev, email: e.target.value }))}
              placeholder="you@example.com"
            />
          </div>
        </div>
        )}

        {match('agents', 'agent', 'emotion') && (
        <div className="settings-section" id="settings-section-agents">
          <h3>Agents</h3>
          <p className="settings-hint">Predefined and custom AI agents (Code Reviewer, Documentation, Refactor, etc.) are managed in the Emotion view. Use the activity bar → Emotion to add or switch agents.</p>
        </div>
        )}

        {match('ai', 'provider', 'openai', 'anthropic', 'google', 'cyrex', 'ollama', 'model', 'api key') && (
        <div className="settings-section" id="settings-section-ai">
          <h3>AI Provider</h3>
          <p className="settings-hint">Choose where AI chat and completions run. Use your own API keys or local runtimes (diri-cyrex / deepiri-ollama).</p>
          <div className="setting-item">
            <label>Provider</label>
            <select
              value={aiSettings.provider}
              onChange={(e) => handleAiChange('provider', e.target.value)}
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {(aiSettings.provider === 'openai' || aiSettings.provider === 'anthropic' || aiSettings.provider === 'google') && (
            <>
              {aiSettings.provider === 'openai' && (
                <>
                  <div className="setting-item">
                    <label>OpenAI API Key</label>
                    <input
                      type="password"
                      value={aiSettings.openaiApiKey}
                      onChange={(e) => handleAiChange('openaiApiKey', e.target.value)}
                      placeholder="sk-..."
                      autoComplete="off"
                    />
                  </div>
                  <div className="setting-item">
                    <label>Model (optional)</label>
                    <input
                      type="text"
                      value={aiSettings.openaiModel}
                      onChange={(e) => handleAiChange('openaiModel', e.target.value)}
                      placeholder="gpt-4o-mini"
                    />
                  </div>
                </>
              )}
              {aiSettings.provider === 'anthropic' && (
                <>
                  <div className="setting-item">
                    <label>Anthropic API Key (Claude)</label>
                    <input
                      type="password"
                      value={aiSettings.anthropicApiKey}
                      onChange={(e) => handleAiChange('anthropicApiKey', e.target.value)}
                      placeholder="sk-ant-..."
                      autoComplete="off"
                    />
                  </div>
                  <div className="setting-item">
                    <label>Model (optional)</label>
                    <input
                      type="text"
                      value={aiSettings.anthropicModel}
                      onChange={(e) => handleAiChange('anthropicModel', e.target.value)}
                      placeholder="claude-3-5-sonnet-20241022"
                    />
                  </div>
                </>
              )}
              {aiSettings.provider === 'google' && (
                <>
                  <div className="setting-item">
                    <label>Google API Key (Gemini)</label>
                    <input
                      type="password"
                      value={aiSettings.googleApiKey}
                      onChange={(e) => handleAiChange('googleApiKey', e.target.value)}
                      placeholder="AIza..."
                      autoComplete="off"
                    />
                  </div>
                  <div className="setting-item">
                    <label>Model (optional)</label>
                    <input
                      type="text"
                      value={aiSettings.googleModel}
                      onChange={(e) => handleAiChange('googleModel', e.target.value)}
                      placeholder="gemini-1.5-flash"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {aiSettings.provider === 'local' && (
            <>
              <div className="setting-item">
                <label>Local runtime</label>
                <select
                  value={aiSettings.localType}
                  onChange={(e) => handleAiChange('localType', e.target.value)}
                >
                  <option value="cyrex">Cyrex / Runtime Services (diri-cyrex)</option>
                  <option value="ollama">Ollama (deepiri-ollama or Ollama)</option>
                </select>
              </div>
              {aiSettings.localType === 'cyrex' && (
                <div className="setting-item">
                  <label>Cyrex / Runtime URL</label>
                  <input
                    type="text"
                    value={aiSettings.localCyrexUrl}
                    onChange={(e) => handleAiChange('localCyrexUrl', e.target.value)}
                    placeholder="http://localhost:8000"
                  />
                </div>
              )}
              {aiSettings.localType === 'ollama' && (
                <>
                  <div className="setting-item">
                    <label>Ollama URL</label>
                    <input
                      type="text"
                      value={aiSettings.localOllamaUrl}
                      onChange={(e) => handleAiChange('localOllamaUrl', e.target.value)}
                      placeholder="http://localhost:11434"
                    />
                  </div>
                  <div className="setting-item">
                    <label>Model name</label>
                    <input
                      type="text"
                      value={aiSettings.localOllamaModel}
                      onChange={(e) => handleAiChange('localOllamaModel', e.target.value)}
                      placeholder="llama3.2"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {aiSettings.provider === 'cyrex' && (
            <div className="setting-item">
              <label>Cyrex / Runtime URL (fallback)</label>
              <input
                type="text"
                value={aiSettings.localCyrexUrl}
                onChange={(e) => handleAiChange('localCyrexUrl', e.target.value)}
                placeholder="http://localhost:8000"
              />
              <span className="settings-hint-inline">Uses env AI_SERVICE_URL if not set. For your own API keys, pick OpenAI / Anthropic / Google above.</span>
            </div>
          )}
        </div>
        )}

        {match('tabs', 'tab', 'editor tab', 'double click', 'close') && (
        <div className="settings-section" id="settings-section-tabs">
          <h3>Tabs</h3>
          <p className="settings-hint">Editor tab behavior.</p>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={tabsSettings.doubleClickToClose}
                onChange={(e) => setTabsSettings(prev => ({ ...prev, doubleClickToClose: e.target.checked }))}
              />
              Double-click to close tab
            </label>
          </div>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={tabsSettings.showFullPathInTab}
                onChange={(e) => setTabsSettings(prev => ({ ...prev, showFullPathInTab: e.target.checked }))}
              />
              Show full path in tab label
            </label>
          </div>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={tabsSettings.confirmCloseUnsaved}
                onChange={(e) => setTabsSettings(prev => ({ ...prev, confirmCloseUnsaved: e.target.checked }))}
              />
              Confirm when closing unsaved tab
            </label>
          </div>
        </div>
        )}

        {match('platform', 'api', 'url', 'backend') && (
        <div className="settings-section" id="settings-section-platform">
          <h3>Platform API</h3>
          <div className="setting-item">
            <label>Backend API URL</label>
            <input
              type="text"
              value={settings.apiUrl}
              onChange={(e) => handleChange('apiUrl', e.target.value)}
            />
          </div>
          <div className="setting-item">
            <label>AI Service URL (Cyrex backend)</label>
            <input
              type="text"
              value={settings.aiServiceUrl}
              onChange={(e) => handleChange('aiServiceUrl', e.target.value)}
            />
          </div>
        </div>
        )}

        {match('editor', 'font', 'auto', 'save') && (
        <div className="settings-section" id="settings-section-editor">
          <h3>Editor</h3>
          <div className="setting-item">
            <label>Font Size</label>
            <input
              type="number"
              value={settings.fontSize}
              onChange={(e) => handleChange('fontSize', parseInt(e.target.value, 10) || 14)}
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
        )}

        {match('theme', 'dark', 'light', 'contrast') && (
        <div className="settings-section" id="settings-section-theme">
          <h3>Theme</h3>
          <div className="setting-item">
            <label>Theme</label>
            <select value={settings.theme} onChange={(e) => handleChange('theme', e.target.value)}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="hc">High Contrast</option>
            </select>
          </div>
        </div>
        )}

        {match('network', 'proxy', 'offline') && (
        <div className="settings-section" id="settings-section-networking">
          <h3>Networking</h3>
          <p className="settings-hint">Proxy and connectivity options.</p>
          <div className="setting-item">
            <label>Proxy URL (optional)</label>
            <input
              type="text"
              value={networking.proxyUrl}
              onChange={(e) => setNetworking(prev => ({ ...prev, proxyUrl: e.target.value }))}
              placeholder="http://proxy:8080"
            />
          </div>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={networking.offlineMode}
                onChange={(e) => setNetworking(prev => ({ ...prev, offlineMode: e.target.checked }))}
              />
              Offline mode (disable network requests)
            </label>
          </div>
        </div>
        )}

        {match('index', 'doc', 'search index', 'exclude') && (
        <div className="settings-section" id="settings-section-indexing">
          <h3>Indexing &amp; Docs</h3>
          <p className="settings-hint">Workspace indexing and documentation sources for search and AI context. The file list in the Workspace view is your index; use Refresh to rebuild.</p>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={indexing.indexOnOpen}
                onChange={(e) => setIndexing(prev => ({ ...prev, indexOnOpen: e.target.checked }))}
              />
              Index workspace when folder is opened
            </label>
          </div>
          <div className="setting-item">
            <label>Exclude patterns (comma-separated)</label>
            <input
              type="text"
              value={indexing.excludePatterns}
              onChange={(e) => setIndexing(prev => ({ ...prev, excludePatterns: e.target.value }))}
              placeholder="node_modules, .git, dist"
            />
          </div>
        </div>
        )}

        {match('hooks', 'lifecycle', 'before save', 'after open') && (
        <div className="settings-section" id="settings-section-hooks">
          <h3>Hooks</h3>
          <p className="settings-hint">Lifecycle hooks: beforeSave, afterSave, afterOpen, beforeClose. Register handlers in code via <code>hooksRegistry.registerHook(HOOK_NAMES.BEFORE_SAVE, async (payload) =&gt; &#123; ... &#125;)</code>.</p>
        </div>
        )}

        {match('tools', 'node', 'python', 'git', 'path') && (
        <div className="settings-section" id="settings-section-tools">
          <h3>Tools</h3>
          <p className="settings-hint">Paths to external tools used for run, terminal, and integrations.</p>
          <div className="setting-item">
            <label>Node.js path (optional)</label>
            <input
              type="text"
              value={tools.nodePath}
              onChange={(e) => setTools(prev => ({ ...prev, nodePath: e.target.value }))}
              placeholder="node or /usr/bin/node"
            />
          </div>
          <div className="setting-item">
            <label>Python path (optional)</label>
            <input
              type="text"
              value={tools.pythonPath}
              onChange={(e) => setTools(prev => ({ ...prev, pythonPath: e.target.value }))}
              placeholder="python3 or /usr/bin/python3"
            />
          </div>
          <div className="setting-item">
            <label>Git path (optional)</label>
            <input
              type="text"
              value={tools.gitPath}
              onChange={(e) => setTools(prev => ({ ...prev, gitPath: e.target.value }))}
              placeholder="git or /usr/bin/git"
            />
          </div>
        </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
