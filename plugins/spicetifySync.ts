import type { Plugin } from 'vite';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface SpicetifySyncOptions {
    /**
     * The theme name at `spicetify/Themes/<themeName>`
     */
    themeName: string;
    /**
     * Path to spicetify root, e.g.
     * `C:/Users/<yourUsername>/AppData/Roaming/spicetify`
     */
    spicetifyRoot?: string;
    /**
     * Location of the source color.ini file, e.g. `src/color.ini`
     */
    colorIni?: string;
    /**
     * Sync mode:
     * - "copy" (default) → copy dist to Spicetify theme folder
     * - "delete" → remove theme folder from Spicetify
     */
    mode?: 'copy' | 'delete';
}

export function spicetifySync(options: SpicetifySyncOptions): Plugin {
    const { themeName, colorIni = 'src/color.ini', mode = 'copy' } = options;

    let spicetifyRoot = options.spicetifyRoot || '';

    function getSpicetifyRoot(): string {
        if (!spicetifyRoot) {
            spicetifyRoot = execSync('spicetify path').toString().trim();
        }
        return spicetifyRoot;
    }

    function getThemeRoot(): string {
        return path.join(getSpicetifyRoot(), 'Themes', themeName);
    }

    function prepareColorIni() {
        if (!colorIni) return;

        const from = path.resolve(colorIni);
        const to = path.resolve('dist', 'color.ini');

        if (!fs.existsSync(from)) return;

        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(from, to);
    }

    function copyDistToSpicetify() {
        const sourceDir = path.resolve('dist');
        if (!fs.existsSync(sourceDir)) return;

        const themeRoot = getThemeRoot();
        fs.mkdirSync(themeRoot, { recursive: true });

        for (const file of fs.readdirSync(sourceDir)) {
            const from = path.join(sourceDir, file);
            const to = path.join(themeRoot, file);

            if (fs.statSync(from).isFile()) {
                fs.copyFileSync(from, to);
            }
        }

        console.log(`[spicetify-sync] copied dist → ${themeRoot}`);
    }

    function deleteTheme() {
        const themeRoot = getThemeRoot();

        if (!fs.existsSync(themeRoot)) {
            console.log(`[spicetify-sync] theme not found: ${themeRoot}`);
            return;
        }

        fs.rmSync(themeRoot, { recursive: true, force: true });

        console.log(`[spicetify-sync] deleted ${themeRoot}`);
    }

    return {
        name: 'spicetify-sync',
        apply: 'build',
        closeBundle() {
            if (mode === 'delete') {
                deleteTheme();
                return;
            }

            prepareColorIni();
            copyDistToSpicetify();
        },
    };
}
