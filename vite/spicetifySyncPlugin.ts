import type { Plugin } from "vite";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

interface SpicetifySyncOptions {
  /**
   * Theme name inside spicetify/Themes/
   */
  themeName: string;

  /**
   * Optional manual spicetify root
   */
  spicetifyRoot?: string;

  /**
   * "copy" (default) or "delete"
   */
  mode?: "copy" | "delete";
}

export default function spicetifySync(options: SpicetifySyncOptions): Plugin {
  const { themeName, mode = "copy" } = options;

  let cachedRoot: string | null = options.spicetifyRoot ?? null;

  const log = (msg: string) => {
    console.log(`[spicetify-sync] ${msg}`);
  };

  function getSpicetifyRoot(): string {
    if (cachedRoot) return cachedRoot;

    try {
      cachedRoot = execSync("spicetify path").toString().trim();
    } catch {
      throw new Error(
        "[spicetify-sync] Failed to resolve spicetify path. Install Spicetify or pass spicetifyRoot manually.",
      );
    }

    return cachedRoot;
  }

  function getThemeRoot(): string {
    return path.join(getSpicetifyRoot(), "Themes", themeName);
  }

  function copyFileSafe(from: string, to: string) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }

  function copyDist() {
    const dist = path.resolve("dist");

    if (!fs.existsSync(dist)) {
      log("dist not found, skipping");
      return;
    }

    const themeRoot = getThemeRoot();
    fs.mkdirSync(themeRoot, { recursive: true });

    for (const file of fs.readdirSync(dist)) {
      const from = path.join(dist, file);
      const to = path.join(themeRoot, file);

      if (fs.statSync(from).isFile()) {
        copyFileSafe(from, to);
      }
    }

    log(`copied dist → ${themeRoot}`);
  }

  function syncColorIni() {
    const from = path.resolve("src/color.ini");
    const to = path.resolve("dist/color.ini");

    if (!fs.existsSync(from)) return;

    copyFileSafe(from, to);
    log("color.ini synced");
  }

  function deleteTheme() {
    const themeRoot = getThemeRoot();

    if (!fs.existsSync(themeRoot)) {
      log("theme not found, skipping delete");
      return;
    }

    fs.rmSync(themeRoot, { recursive: true, force: true });
    log(`deleted ${themeRoot}`);
  }

  return {
    name: "spicetify-sync",
    apply: "build",

    closeBundle() {
      // vite build --mode delete
      const isDelete = mode === "delete" || process.env.NODE_ENV === "delete";

      if (isDelete) {
        deleteTheme();
        return;
      }

      syncColorIni();
      copyDist();
    },
  };
}
