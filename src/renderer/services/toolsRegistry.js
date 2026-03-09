/**
 * Registry of callable tools for AI and automation.
 * Tools can be invoked by the chat backend (function calling) or from the UI.
 */
import { api } from '../api';

const tools = new Map();

export function registerTool(id, { name, description, handler, paramsSchema }) {
  tools.set(id, { id, name, description, handler, paramsSchema });
}

export function unregisterTool(id) {
  tools.delete(id);
}

export function getTools() {
  return Array.from(tools.values());
}

export function getTool(id) {
  return tools.get(id) ?? null;
}

export async function invokeTool(id, args = {}) {
  const tool = tools.get(id);
  if (!tool?.handler) throw new Error(`Tool not found: ${id}`);
  return tool.handler(args);
}

/** Built-in tools; call when app is ready (api may not be available at module load). */
export function registerBuiltinTools() {
  try {
    registerTool('run_command', {
      name: 'Run command',
      description: 'Run a shell command in the project terminal',
      paramsSchema: { command: 'string', cwd: 'string (optional)' },
      handler: async ({ command, cwd }) => {
        if (!command) return { ok: false, error: 'command required' };
        await api.runCommand({ terminalId: 'default', command, cwd });
        return { ok: true, message: 'Command sent to terminal' };
      }
    });
    registerTool('read_file', {
      name: 'Read file',
      description: 'Read contents of a file',
      paramsSchema: { path: 'string' },
      handler: async ({ path }) => {
        if (!path) return { ok: false, error: 'path required' };
        const content = await api.openFile(path);
        return { ok: true, content };
      }
    });
  } catch (e) {
    console.warn('[toolsRegistry] registerBuiltinTools failed (API not ready?):', e?.message);
  }
}
