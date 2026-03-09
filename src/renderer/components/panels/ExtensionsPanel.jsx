import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';

/**
 * Integrations panel: connected platforms (extensions/ folder + stored credentials)
 * and catalog of platforms to connect to. Connect, Disconnect, Sync with modals.
 */
export default function ExtensionsPanel() {
  const [installed, setInstalled] = useState([]);
  const [available, setAvailable] = useState([]);
  const [connectedIds, setConnectedIds] = useState({});
  const [loading, setLoading] = useState(true);
  const [connectModal, setConnectModal] = useState(null); // { id, name }
  const [connectToken, setConnectToken] = useState('');
  const [syncModal, setSyncModal] = useState(null); // { id, name } then { id, result }
  const [syncRepo, setSyncRepo] = useState('');
  const [syncResult, setSyncResult] = useState(null); // { success, data, error }
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [extData, statusData] = await Promise.all([
        api.listExtensions(),
        api.getIntegrationStatus().catch(() => ({ connected: {} }))
      ]);
      const inst = Array.isArray(extData?.installed) ? extData.installed : [];
      const av = Array.isArray(extData?.available) ? extData.available : [];
      setInstalled(inst);
      setAvailable(av);
      setConnectedIds(statusData?.connected || {});
    } catch {
      setInstalled([]);
      setAvailable([]);
      setConnectedIds({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleConnectOpen = (item) => {
    setConnectModal({ id: item.id, name: item.name });
    setConnectToken('');
  };

  const handleConnectSubmit = async () => {
    if (!connectModal || !connectToken.trim()) return;
    setActionLoading(true);
    try {
      const result = await api.connectIntegration({
        id: connectModal.id,
        token: connectToken.trim(),
        label: connectModal.name
      });
      if (result?.success) {
        setConnectModal(null);
        setConnectToken('');
        await load();
      } else {
        alert(result?.error || 'Connect failed');
      }
    } catch (e) {
      alert(e?.message || 'Connect failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async (id) => {
    if (!id || !window.confirm(`Disconnect ${id}? This removes stored credentials.`)) return;
    setActionLoading(true);
    try {
      await api.disconnectIntegration(id);
      await load();
    } catch (e) {
      alert(e?.message || 'Disconnect failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncOpen = (item) => {
    setSyncModal({ id: item.id, name: item.name });
    setSyncRepo('');
    setSyncResult(null);
  };

  const handleSyncSubmit = async () => {
    if (!syncModal) return;
    setActionLoading(true);
    setSyncResult(null);
    try {
      const options = syncModal.id === 'github' ? { repo: syncRepo.trim() } : {};
      const result = await api.syncIntegration({ id: syncModal.id, options });
      setSyncResult(result);
    } catch (e) {
      setSyncResult({ success: false, error: e?.message || 'Sync failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleImportIssuesAsTasks = async () => {
    if (!syncResult?.success || !Array.isArray(syncResult.data)) return;
    setActionLoading(true);
    try {
      let count = 0;
      for (const issue of syncResult.data.slice(0, 50)) {
        await api.createTask(issue.title, issue.body || issue.url || '', 'github');
        count++;
      }
      alert(`Imported ${count} issues as tasks.`);
      setSyncModal(null);
      setSyncResult(null);
    } catch (e) {
      alert(e?.message || 'Import failed');
    } finally {
      setActionLoading(false);
    }
  };

  const supportedForConnect = new Set(['github', 'notion', 'linear', 'slack', 'jira']);

  const renderItem = (item, opts = {}) => {
    const { showActions = false, isConnected: connected } = opts;
    const canConnect = supportedForConnect.has(item.id);
    const hasStoredCreds = !!connectedIds[item.id];

    return (
      <div key={item.id} className="extensions-item">
        <div className="extensions-item-row">
          <div className="extensions-item-main">
            <div className="extensions-item-name">{item.name}</div>
            {(item.category && item.category !== 'Other') && (
              <span className="extensions-item-category">{item.category}</span>
            )}
            <div className="extensions-item-desc">{item.description}</div>
          </div>
          {showActions && (
            <div className="extensions-item-actions">
              {connected || hasStoredCreds ? (
                <>
                  {(item.id === 'github' || item.id === 'notion') && (
                    <button
                      type="button"
                      className="extensions-btn extensions-btn-primary"
                      onClick={() => handleSyncOpen(item)}
                      disabled={actionLoading}
                    >
                      Sync
                    </button>
                  )}
                  {hasStoredCreds && (
                    <button
                      type="button"
                      className="extensions-btn extensions-btn-secondary"
                      onClick={() => handleDisconnect(item.id)}
                      disabled={actionLoading}
                    >
                      Disconnect
                    </button>
                  )}
                </>
              ) : canConnect ? (
                <button
                  type="button"
                  className="extensions-btn extensions-btn-primary"
                  onClick={() => handleConnectOpen(item)}
                  disabled={actionLoading}
                >
                  Connect
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    );
  };

  const connectedFromCatalog = available.filter((a) => connectedIds[a.id]);
  const availableToConnect = available.filter((a) => !connectedIds[a.id]);

  return (
    <div className="extensions-panel">
      <div className="extensions-header">Integrations</div>
      <p className="extensions-hint extensions-subtitle">Connect to platforms and sync tasks, docs, and data.</p>

      <div className="extensions-list">
        <div className="extensions-section-title">Connected</div>
        {loading ? (
          <p className="extensions-hint">Loading…</p>
        ) : installed.length === 0 && connectedFromCatalog.length === 0 ? (
          <p className="extensions-hint">No integrations connected yet. Connect a platform below or add integrations in the <code>extensions/</code> folder.</p>
        ) : (
          <>
            {installed.map((ext) => renderItem(ext, { showActions: true, isConnected: true }))}
            {connectedFromCatalog.map((item) => renderItem(item, { showActions: true, isConnected: true }))}
          </>
        )}
      </div>

      <div className="extensions-list extensions-list-available">
        <div className="extensions-section-title">Available to connect ({availableToConnect.length} platforms)</div>
        {loading ? null : availableToConnect.length === 0 ? (
          <p className="extensions-hint">No additional platforms in catalog.</p>
        ) : (
          <div className="extensions-available-grid">
            {availableToConnect.map((item) => renderItem(item, { showActions: true, isConnected: false }))}
          </div>
        )}
      </div>

      {/* Connect modal */}
      {connectModal && (
        <div className="extensions-modal-overlay" onClick={() => !actionLoading && setConnectModal(null)}>
          <div className="extensions-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Connect to {connectModal.name}</h4>
            <p className="extensions-hint">
              {connectModal.id === 'github' && 'Enter a GitHub Personal Access Token (classic or fine-grained with repo scope).'}
              {connectModal.id === 'notion' && 'Enter your Notion integration token (Internal Integration).'}
              {!['github', 'notion'].includes(connectModal.id) && 'Enter API key or token.'}
            </p>
            <input
              type="password"
              className="extensions-input"
              placeholder="Token or API key"
              value={connectToken}
              onChange={(e) => setConnectToken(e.target.value)}
              autoFocus
            />
            <div className="extensions-modal-actions">
              <button type="button" className="extensions-btn extensions-btn-secondary" onClick={() => setConnectModal(null)} disabled={actionLoading}>
                Cancel
              </button>
              <button type="button" className="extensions-btn extensions-btn-primary" onClick={handleConnectSubmit} disabled={actionLoading || !connectToken.trim()}>
                {actionLoading ? 'Connecting…' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync modal (GitHub repo input, then result + Import as tasks) */}
      {syncModal && (
        <div className="extensions-modal-overlay" onClick={() => !actionLoading && (setSyncModal(null), setSyncResult(null))}>
          <div className="extensions-modal extensions-modal-wide" onClick={(e) => e.stopPropagation()}>
            <h4>Sync from {syncModal.name}</h4>
            {syncModal.id === 'github' && !syncResult && (
              <>
                <p className="extensions-hint">Enter repository as owner/repo (e.g. octocat/Hello-World).</p>
                <input
                  type="text"
                  className="extensions-input"
                  placeholder="owner/repo"
                  value={syncRepo}
                  onChange={(e) => setSyncRepo(e.target.value)}
                />
                <div className="extensions-modal-actions">
                  <button type="button" className="extensions-btn extensions-btn-secondary" onClick={() => setSyncModal(null)} disabled={actionLoading}>
                    Cancel
                  </button>
                  <button type="button" className="extensions-btn extensions-btn-primary" onClick={handleSyncSubmit} disabled={actionLoading || !syncRepo.trim()}>
                    {actionLoading ? 'Syncing…' : 'Fetch issues'}
                  </button>
                </div>
              </>
            )}
            {syncModal.id === 'notion' && !syncResult && (
              <>
                <p className="extensions-hint">Fetch your Notion databases.</p>
                <div className="extensions-modal-actions">
                  <button type="button" className="extensions-btn extensions-btn-secondary" onClick={() => setSyncModal(null)} disabled={actionLoading}>
                    Cancel
                  </button>
                  <button type="button" className="extensions-btn extensions-btn-primary" onClick={() => handleSyncSubmit()} disabled={actionLoading}>
                    {actionLoading ? 'Syncing…' : 'Fetch databases'}
                  </button>
                </div>
              </>
            )}
            {syncResult && (
              <>
                {syncResult.success ? (
                  <>
                    <p className="extensions-hint">
                      {Array.isArray(syncResult.data) ? `Fetched ${syncResult.data.length} items.` : 'Done.'}
                    </p>
                    {syncModal.id === 'github' && Array.isArray(syncResult.data) && syncResult.data.length > 0 && (
                      <div className="extensions-sync-list">
                        {syncResult.data.slice(0, 10).map((i) => (
                          <div key={i.id} className="extensions-sync-item">
                            <span className="extensions-sync-title">#{i.number} {i.title}</span>
                          </div>
                        ))}
                        {syncResult.data.length > 10 && <p className="extensions-hint">… and {syncResult.data.length - 10} more</p>}
                      </div>
                    )}
                    {syncModal.id === 'notion' && Array.isArray(syncResult.data) && syncResult.data.length > 0 && (
                      <div className="extensions-sync-list">
                        {syncResult.data.slice(0, 15).map((db) => (
                          <div key={db.id} className="extensions-sync-item">
                            <span className="extensions-sync-title">{db.title || db.id}</span>
                          </div>
                        ))}
                        {syncResult.data.length > 15 && <p className="extensions-hint">… and {syncResult.data.length - 15} more</p>}
                      </div>
                    )}
                    {syncModal.id === 'github' && Array.isArray(syncResult.data) && syncResult.data.length > 0 && (
                      <button type="button" className="extensions-btn extensions-btn-primary" onClick={handleImportIssuesAsTasks} disabled={actionLoading}>
                        {actionLoading ? 'Importing…' : 'Import as tasks'}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="extensions-error">{syncResult.error || 'Sync failed'}</p>
                )}
                <div className="extensions-modal-actions">
                  <button type="button" className="extensions-btn extensions-btn-secondary" onClick={() => { setSyncModal(null); setSyncResult(null); }}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
