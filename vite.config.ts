import { defineConfig } from 'vite';
import { spicetifySync } from './plugins/spicetifySync';
import packageJson from './package.json';

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(packageJson.version),
        __APP_AUTHOR__: JSON.stringify(packageJson.author),
        __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
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
        }),
    ],
});
