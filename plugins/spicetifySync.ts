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
     * `C:/Users/<your_username>/AppData/Roaming/spicetify`
     */
    spicetifyRoot?: string;
    /**
     * Location of the source color.ini file, e.g.
     * `src/color.ini`
     */
    colorIni?: string;
}

export function spicetifySync(options: SpicetifySyncOptions): Plugin {
    const { themeName, colorIni = 'src/color.ini' } = options;

    let spicetifyRoot = options.spicetifyRoot || '';

    function getSpicetifyRoot(): string {
        if (!spicetifyRoot) {
            spicetifyRoot = execSync('spicetify path').toString().trim();
        }
        return spicetifyRoot;
    }

    function prepareDist() {
        if (!colorIni) return;

        const from = path.resolve(colorIni);
        const to = path.resolve('dist', 'color.ini');

        if (!fs.existsSync(from)) return;

        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(from, to);

        /* Quiet now
        console.log('[spicetify-sync] color.ini → dist');*/
    }

    function syncDistToTheme() {
        const sourceDir = path.resolve('dist');
        if (!fs.existsSync(sourceDir)) return;

        const themeRoot = path.join(getSpicetifyRoot(), 'Themes', themeName);

        fs.mkdirSync(themeRoot, { recursive: true });

        for (const file of fs.readdirSync(sourceDir)) {
            const from = path.join(sourceDir, file);
            const to = path.join(themeRoot, file);

            if (fs.statSync(from).isFile()) {
                fs.copyFileSync(from, to);
            }
        }

        console.log(`[spicetify-sync] dist → ${themeRoot}`);
    }

    return {
        name: 'spicetify-sync',
        apply: 'build',

        closeBundle() {
            prepareDist();
            syncDistToTheme();
        },
    };
}
