import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadPluginConfig } from './loader';

describe('loadPluginConfig sourcePaths merge semantics', () => {
  const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
  let projectRoot: string;
  let xdgConfigHome: string;

  beforeEach(() => {
    projectRoot = path.join(
      os.tmpdir(),
      `historian-config-project-${crypto.randomUUID()}`,
    );
    xdgConfigHome = path.join(
      os.tmpdir(),
      `historian-config-user-${crypto.randomUUID()}`,
    );

    fs.mkdirSync(path.join(projectRoot, '.opencode'), { recursive: true });
    fs.mkdirSync(path.join(xdgConfigHome, 'opencode'), { recursive: true });
    process.env.XDG_CONFIG_HOME = xdgConfigHome;
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
    fs.rmSync(xdgConfigHome, { recursive: true, force: true });

    if (originalXdgConfigHome === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
    }
  });

  it('uses user sourcePaths when project sourcePaths is absent', () => {
    fs.writeFileSync(
      path.join(xdgConfigHome, 'opencode', 'opencode-historian.json'),
      JSON.stringify({ sourcePaths: ['./docs/**/*.md'] }),
    );

    const config = loadPluginConfig(projectRoot);

    expect(config.sourcePaths).toEqual(['./docs/**/*.md']);
  });

  it('project sourcePaths overrides user sourcePaths when provided', () => {
    fs.writeFileSync(
      path.join(xdgConfigHome, 'opencode', 'opencode-historian.json'),
      JSON.stringify({ sourcePaths: ['./docs/**/*.md'] }),
    );
    fs.writeFileSync(
      path.join(projectRoot, '.opencode', 'opencode-historian.json'),
      JSON.stringify({ sourcePaths: ['./sources/'] }),
    );

    const config = loadPluginConfig(projectRoot);

    expect(config.sourcePaths).toEqual(['./sources/']);
  });

  it('project empty sourcePaths overrides user sourcePaths', () => {
    fs.writeFileSync(
      path.join(xdgConfigHome, 'opencode', 'opencode-historian.json'),
      JSON.stringify({ sourcePaths: ['./docs/**/*.md'] }),
    );
    fs.writeFileSync(
      path.join(projectRoot, '.opencode', 'opencode-historian.json'),
      JSON.stringify({ sourcePaths: [] }),
    );

    const config = loadPluginConfig(projectRoot);

    expect(config.sourcePaths).toEqual([]);
  });
});
