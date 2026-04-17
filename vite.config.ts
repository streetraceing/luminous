import packageJson from "./package.json";

import { defineConfig } from "vite";
import getBuildTime from "./vite/getBuildTime";
import spicetifySync from "./vite/spicetifySyncPlugin";

export default defineConfig(({ mode }) => {
  const syncMode = mode === "delete" ? "delete" : "copy";

  return {
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
      __APP_AUTHOR__: JSON.stringify(packageJson.author.name),
      __BUILD_TIME__: JSON.stringify(getBuildTime()),
    },

    build: {
      outDir: "dist",
      emptyOutDir: false,
      cssCodeSplit: false,
      rollupOptions: {
        input: "src/index.ts",
        output: {
          entryFileNames: "theme.js",
          assetFileNames: "user.css",
        },
      },
    },

    plugins: [
      spicetifySync({
        themeName: "Luminous",
        mode: syncMode,
      }),
    ],
  };
});
