import packageJson from './package.json';

import { defineConfig } from 'vite';
import { formatBuildTime } from './plugins/buildTime';
import { spicetifySync } from './plugins/spicetifySync';

export default defineConfig(({ mode }) => {
    const syncMode = mode === 'delete' ? 'delete' : 'copy';

    return {
        define: {
            __APP_VERSION__: JSON.stringify(packageJson.version),
            __APP_AUTHOR__: JSON.stringify(packageJson.author),
            __BUILD_TIME__: JSON.stringify(formatBuildTime()),
        },

        build: {
            outDir: 'dist',
            emptyOutDir: true,
            cssCodeSplit: false,
            rollupOptions: {
                input: 'src/index.ts',
                output: {
                    entryFileNames: 'theme.js',
                    assetFileNames: 'user.css',
                },
            },
        },

        plugins: [
            spicetifySync({
                themeName: 'Luminous',
                mode: syncMode,
            }),
        ],
    };
});
