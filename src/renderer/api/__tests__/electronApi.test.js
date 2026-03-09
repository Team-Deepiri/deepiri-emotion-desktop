/**
 * API facade tests: null-safety and delegation.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { getElectronAPI, hasChatCompletion, hasAiSettings, api } from '../electronApi';

describe('electronApi', () => {
  afterEach(() => {
    if (global.window && !global.window.electronAPI) global.window.electronAPI = undefined;
  });

  describe('getElectronAPI', () => {
    it('returns null when window.electronAPI is undefined', () => {
      const win = global.window;
      delete global.window.electronAPI;
      expect(getElectronAPI()).toBeNull();
      global.window.electronAPI = win?.electronAPI;
    });

    it('returns the bridge when present', () => {
      const bridge = { getProjectRoot: () => Promise.resolve('/tmp') };
      global.window = { electronAPI: bridge };
      expect(getElectronAPI()).toBe(bridge);
    });
  });

  describe('hasChatCompletion / hasAiSettings', () => {
    it('returns false when bridge is missing', () => {
      const win = global.window;
      delete global.window.electronAPI;
      expect(hasChatCompletion()).toBe(false);
      expect(hasAiSettings()).toBe(false);
      global.window.electronAPI = win?.electronAPI;
    });

    it('returns true when bridge has required methods', () => {
      global.window = {
        electronAPI: {
          chatCompletion: () => {},
          getAiSettings: () => {},
          setAiSettings: () => {}
        }
      };
      expect(hasChatCompletion()).toBe(true);
      expect(hasAiSettings()).toBe(true);
    });
  });

  describe('api (facade)', () => {
    it('getProjectRoot rejects when bridge is missing', async () => {
      const win = global.window;
      delete global.window.electronAPI;
      await expect(api.getProjectRoot()).rejects.toThrow('Electron API not available');
      global.window.electronAPI = win?.electronAPI;
    });

    it('getProjectRoot resolves with value when bridge returns', async () => {
      const prev = global.window.electronAPI;
      global.window.electronAPI = {
        getProjectRoot: () => Promise.resolve('/home/proj')
      };
      const root = await api.getProjectRoot();
      expect(root).toBe('/home/proj');
      global.window.electronAPI = prev;
    });

    it('onMenuSettings returns no-op unsub when bridge is missing', () => {
      const win = global.window;
      delete global.window.electronAPI;
      const unsub = api.onMenuSettings(() => {});
      expect(typeof unsub).toBe('function');
      unsub();
      global.window.electronAPI = win?.electronAPI;
    });
  });
});
