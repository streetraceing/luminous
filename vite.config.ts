import { defineConfig } from 'vite';
import { spicetifySync } from './plugins/spicetifySync';

export default defineConfig({
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
            colorIni: 'src/color.ini',
        }),
    ],
});
