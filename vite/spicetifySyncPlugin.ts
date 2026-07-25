import type { Plugin, ResolvedConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

interface SpicetifySyncOptions {
  /**
   * Theme name inside spicetify/Themes/
   */
  themeName: string;

  /**
   * Optional manual spicetify root
   */
  spicetifyRoot?: string;
}

export default function spicetifySync(options: SpicetifySyncOptions): Plugin {
  const { themeName } = options;

  let cachedRoot: string | null = options.spicetifyRoot ?? null;
  let config: ResolvedConfig | null = null;

  const log = (msg: string) => {
    console.log(`[spicetify-sync] ${msg}`);
  };

  function getSpicetifyRoot(): string {
    if (cachedRoot) return cachedRoot;

    try {
      const resolvedRoot = execFileSync('spicetify', ['path'], {
        encoding: 'utf8',
      }).trim();

      if (!resolvedRoot) {
        throw new Error('Spicetify returned an empty path');
      }

      cachedRoot = resolvedRoot;
    } catch {
      throw new Error(
        '[spicetify-sync] Failed to resolve spicetify path. Install Spicetify or pass spicetifyRoot manually.',
      );
    }

    return cachedRoot;
  }

  function getThemeRoot(): string {
    return path.join(getSpicetifyRoot(), 'Themes', themeName);
  }

  function resolveProjectPath(...parts: string[]) {
    return path.resolve(config?.root ?? process.cwd(), ...parts);
  }

  function getDistRoot(): string {
    const outDir = config?.build.outDir ?? 'dist';

    return path.isAbsolute(outDir) ? outDir : resolveProjectPath(outDir);
  }

  function copyFileSafe(from: string, to: string) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }

  function copyDist() {
    const dist = getDistRoot();

    if (!fs.existsSync(dist)) {
      log('dist not found, skipping');
      return;
    }

    const themeRoot = getThemeRoot();
    const stagingRoot = path.join(
      path.dirname(themeRoot),
      `.${path.basename(themeRoot)}.sync-tmp`,
    );

    fs.mkdirSync(path.dirname(themeRoot), { recursive: true });
    fs.rmSync(stagingRoot, { recursive: true, force: true });

    try {
      fs.cpSync(dist, stagingRoot, { recursive: true });
      fs.rmSync(themeRoot, { recursive: true, force: true });
      fs.renameSync(stagingRoot, themeRoot);
    } catch (error) {
      fs.rmSync(stagingRoot, { recursive: true, force: true });
      throw error;
    }

    log(`copied dist -> ${themeRoot}`);
  }

  function syncColorIni() {
    const from = resolveProjectPath('src', 'color.ini');
    const to = path.join(getDistRoot(), 'color.ini');

    if (!fs.existsSync(from)) return;

    copyFileSafe(from, to);
    log('color.ini synced');
  }

  function deleteTheme() {
    const themeRoot = getThemeRoot();
    const stagingRoot = path.join(
      path.dirname(themeRoot),
      `.${path.basename(themeRoot)}.sync-tmp`,
    );

    fs.rmSync(stagingRoot, { recursive: true, force: true });

    if (!fs.existsSync(themeRoot)) {
      log('theme not found, skipping delete');
      return;
    }

    fs.rmSync(themeRoot, { recursive: true, force: true });
    log(`deleted ${themeRoot}`);
  }

  return {
    name: 'spicetify-sync',
    apply: 'build',

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    closeBundle() {
      const mode = config?.mode;

      if (mode === 'sync') {
        syncColorIni();
        copyDist();
        return;
      }

      if (mode === 'delete') {
        deleteTheme();
        return;
      }
    },
  };
}
