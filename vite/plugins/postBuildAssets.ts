import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

export function postBuildAssets(): Plugin {
    return {
        name: 'post-build-assets',
        closeBundle() {
            // color.ini
            const srcColor = path.resolve('src/color.ini');
            const rootColor = path.resolve('dist/color.ini');

            if (fs.existsSync(srcColor)) {
                fs.copyFileSync(srcColor, rootColor);
            }
        },
    };
}
