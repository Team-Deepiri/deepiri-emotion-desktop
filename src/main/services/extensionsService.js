/**
 * Extensions service: scan built-in integrations from extensions/ folder
 * and merge with catalog of platform integrations we can connect to.
 */
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { app } from 'electron';
import { IPC } from '../../shared/ipcChannels.js';
import { INTEGRATIONS_CATALOG } from '../../shared/integrationsCatalog.js';

function getExtensionsDir() {
  return join(app.getAppPath(), 'extensions');
}

/** Dedupe by id and exclude already-connected (by id). */
function getAvailableIntegrations(installedIds) {
  const installedSet = new Set(installedIds.map((x) => x.toLowerCase()));
  return INTEGRATIONS_CATALOG.filter((e) => !installedSet.has((e.id || '').toLowerCase())).map((e) => ({
    id: e.id,
    name: e.name,
    description: e.description || '',
    category: e.category || 'Other',
    version: '-',
    enabled: false
  }));
}

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {object} _deps
 */
export function registerExtensionsService(ipcMain, _deps) {
  ipcMain.handle(IPC.LIST_EXTENSIONS, async () => {
    const installed = [];
    const extDir = getExtensionsDir();
    try {
      const entries = await readdir(extDir, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        const pkgPath = join(extDir, e.name, 'package.json');
        let manifest;
        try {
          const raw = await readFile(pkgPath, 'utf-8');
          manifest = JSON.parse(raw);
        } catch {
          continue;
        }
        installed.push({
          id: manifest.name || e.name,
          name: manifest.displayName || manifest.name || e.name,
          description: manifest.description || '',
          version: manifest.version || '1.0.0',
          enabled: true
        });
      }
    } catch {
      // no extensions folder or not readable
    }
    const installedIds = installed.map((x) => x.id);
    const available = getAvailableIntegrations(installedIds);
    return { installed, available };
  });
}
