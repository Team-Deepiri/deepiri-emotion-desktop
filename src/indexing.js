/**
 * Workspace indexing and file listing.
 * Runs in the main process (Node); keeps indexing rules and recursion in one place.
 */
import { readdir } from 'fs/promises';
import { join } from 'path';
import { DEFAULT_SKIP_DIRS } from './shared/defaults.js';
import { INDEXING_MAX_FILES } from './shared/constants.js';

/**
 * Parse exclude patterns string (e.g. "node_modules, .git, dist") into a Set of dir names.
 * @param {string} patterns - Comma-separated list of names or globs; only simple names are used for directory skip.
 * @returns {Set<string>}
 */
export function parseExcludePatterns(patterns) {
  const set = new Set(DEFAULT_SKIP_DIRS);
  if (!patterns || typeof patterns !== 'string') return set;
  const parts = patterns.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean);
  for (const p of parts) {
    if (!p.includes('*') && !p.includes('/')) set.add(p);
  }
  return set;
}

/**
 * Recursively list workspace files and folders.
 * @param {string} rootDir - Root directory path
 * @param {Object} options - { relativeDir: string, out: array, maxFiles: number, skipDirs: Set<string> }
 */
export async function listWorkspaceFilesRecursive(rootDir, options = {}) {
  const {
    relativeDir = '',
    out = [],
    maxFiles = INDEXING_MAX_FILES,
    skipDirs = new Set(DEFAULT_SKIP_DIRS)
  } = options;

  if (out.length >= maxFiles) return;
  let entries;
  try {
    entries = await readdir(rootDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const e of entries) {
    if (out.length >= maxFiles) break;
    const fullPath = join(rootDir, e.name);
    const rel = relativeDir ? `${relativeDir}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (skipDirs.has(e.name)) continue;
      out.push({ path: fullPath, name: e.name, isDirectory: true, relativePath: rel });
      await listWorkspaceFilesRecursive(fullPath, { ...options, relativeDir: rel, out, maxFiles, skipDirs });
    } else {
      out.push({ path: fullPath, name: e.name, isDirectory: false, relativePath: rel });
    }
  }
}

/**
 * List all files and folders under rootDir, with optional exclude patterns string.
 * @param {string} rootDir
 * @param {string} [excludePatterns] - Comma-separated (e.g. from settings)
 * @returns {Promise<{ files: Array, totalFiles: number, totalFolders: number }>}
 */
export async function listWorkspaceFiles(rootDir, excludePatterns) {
  if (!rootDir) return { files: [], totalFiles: 0, totalFolders: 0 };
  const skipDirs = parseExcludePatterns(excludePatterns);
  const files = [];
  await listWorkspaceFilesRecursive(rootDir, { out: files, skipDirs });
  const totalFiles = files.filter((f) => !f.isDirectory).length;
  const totalFolders = files.filter((f) => f.isDirectory).length;
  return { files, totalFiles, totalFolders };
}
