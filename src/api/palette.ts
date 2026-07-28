import { Logger } from './logger';

const PALETTE_CLASS = 'luminous-dynamic-palette';
const PALETTE_VARIABLES = [
  '--luminous-palette-primary',
  '--luminous-palette-light',
  '--luminous-palette-dark',
] as const;

export class Palette {
  private static requestId = 0;
  private static source: string | null = null;

  static cancel() {
    this.requestId++;
  }

  static clear() {
    this.cancel();
    this.source = null;
    this.clearAppliedPalette();
  }

  static async applyFromImage(image: string | null | undefined) {
    if (!image) {
      this.clear();
      return;
    }

    if (
      image === this.source &&
      document.documentElement.classList.contains(PALETTE_CLASS)
    ) {
      return;
    }

    const extractColorPreset = Spicetify.extractColorPreset;
    if (typeof extractColorPreset !== 'function') {
      this.clear();
      return;
    }

    const requestId = ++this.requestId;

    try {
      const presets = await extractColorPreset(image);
      if (requestId !== this.requestId) return;

      const palette =
        presets.find((preset) => !preset.isFallback) ?? presets[0];
      if (!palette) {
        this.clearAppliedPalette();
        return;
      }

      const colors = {
        primary: palette.colorRaw.toString(),
        light: palette.colorLight.toString(),
        dark: palette.colorDark.toString(),
      };

      if (Object.values(colors).some((color) => !color)) {
        this.clearAppliedPalette();
        return;
      }

      const root = document.documentElement;
      root.style.setProperty('--luminous-palette-primary', colors.primary);
      root.style.setProperty('--luminous-palette-light', colors.light);
      root.style.setProperty('--luminous-palette-dark', colors.dark);
      root.classList.add(PALETTE_CLASS);
      this.source = image;
    } catch (error) {
      if (requestId !== this.requestId) return;

      this.source = null;
      this.clearAppliedPalette();
      Logger.warn('Main', 'Failed to extract dynamic palette', error);
    }
  }

  private static clearAppliedPalette() {
    const root = document.documentElement;
    PALETTE_VARIABLES.forEach((variable) => {
      root.style.removeProperty(variable);
    });
    root.classList.remove(PALETTE_CLASS);
  }
}
