import { defineConfig } from 'vite';
import { resolve } from 'path';
import { postBuildAssets } from './vite/plugins/postBuildAssets';

export default defineConfig({
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        cssCodeSplit: false,
        rollupOptions: {
            input: resolve(__dirname, 'src/index.ts'),
            output: {
                entryFileNames: 'theme.js',
                assetFileNames: 'user.css',
            },
        },
    },
    plugins: [postBuildAssets()]
});
