import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

export function postBuildAssets(): Plugin {
    return {
        name: 'post-build-assets',
        closeBundle() {
            // user.css
            const distCss = path.resolve('dist/user.css');
            const rootCss = path.resolve('user.css');

            if (fs.existsSync(distCss)) {
                fs.copyFileSync(distCss, rootCss);
                fs.unlinkSync(distCss);
            }

            // color.ini
            const srcColor = path.resolve('src/color.ini');
            const rootColor = path.resolve('color.ini');

            if (fs.existsSync(srcColor)) {
                fs.copyFileSync(srcColor, rootColor);
            }
        },
    };
}
