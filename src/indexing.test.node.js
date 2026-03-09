/**
 * Node tests for src/indexing.js (run with vitest --config vitest.config.node.js).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { parseExcludePatterns, listWorkspaceFiles } from './indexing.js';

describe('parseExcludePatterns', () => {
  it('returns default skip set when given nothing', () => {
    const set = parseExcludePatterns();
    expect(set.has('node_modules')).toBe(true);
    expect(set.has('.git')).toBe(true);
    expect(set.has('dist')).toBe(true);
  });

  it('returns default when given empty string', () => {
    const set = parseExcludePatterns('');
    expect(set.has('node_modules')).toBe(true);
  });

  it('adds custom names from comma-separated string', () => {
    const set = parseExcludePatterns('  custom ,  .cache  ');
    expect(set.has('custom')).toBe(true);
    expect(set.has('.cache')).toBe(true);
    expect(set.has('node_modules')).toBe(true);
  });

  it('ignores glob-like patterns (no slash or star for dir skip)', () => {
    const set = parseExcludePatterns('*.log, foo/bar');
    expect(set.has('*.log')).toBe(false);
    expect(set.has('foo/bar')).toBe(false);
  });

  it('normalizes to lowercase', () => {
    const set = parseExcludePatterns('NODE_MODULES');
    expect(set.has('node_modules')).toBe(true);
  });
});

describe('listWorkspaceFiles', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'indexing-test-'));
  });

  afterEach(() => {
    try {
      rmSync(tmpDir, { recursive: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it('returns empty when rootDir is empty', async () => {
    const out = await listWorkspaceFiles('');
    expect(out.files).toEqual([]);
    expect(out.totalFiles).toBe(0);
    expect(out.totalFolders).toBe(0);
  });

  it('returns empty when rootDir is null/undefined', async () => {
    const out = await listWorkspaceFiles(null);
    expect(out.files).toEqual([]);
  });

  it('lists files and folders and respects skip dirs', async () => {
    mkdirSync(join(tmpDir, 'node_modules'), { recursive: true });
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'a.js'), '');
    writeFileSync(join(tmpDir, 'readme.md'), '');
    const out = await listWorkspaceFiles(tmpDir);
    const names = out.files.map((f) => f.name);
    expect(names).not.toContain('node_modules');
    expect(names).toContain('src');
    expect(names).toContain('readme.md');
    expect(out.files.some((f) => f.relativePath === 'src/a.js')).toBe(true);
    expect(out.totalFiles).toBe(2);
    expect(out.totalFolders).toBeGreaterThanOrEqual(1);
  });

  it('applies custom exclude patterns', async () => {
    mkdirSync(join(tmpDir, 'skipme'), { recursive: true });
    writeFileSync(join(tmpDir, 'keep.txt'), '');
    const out = await listWorkspaceFiles(tmpDir, 'skipme');
    const names = out.files.map((f) => f.name);
    expect(names).not.toContain('skipme');
    expect(names).toContain('keep.txt');
  });
});
