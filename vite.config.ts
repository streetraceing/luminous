import packageJson from './package.json';

import { defineConfig } from 'vite';
import getBuildTime from './vite/getBuildTime';
import spicetifySync from './vite/spicetifySyncPlugin';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __APP_AUTHOR__: JSON.stringify(packageJson.author.name),
    __BUILD_TIME__: JSON.stringify(getBuildTime()),
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    rolldownOptions: {
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
