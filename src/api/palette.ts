const PALETTE_CLASS = 'luminous-dynamic-palette';
const PALETTE_VARIABLES = [
  '--luminous-palette-primary',
  '--luminous-palette-light',
  '--luminous-palette-dark',
] as const;
const SAMPLE_SIZE = 32;
const MAX_CACHED_PALETTES = 24;

type PaletteColors = {
  primary: string;
  light: string;
  dark: string;
};

type Rgb = {
  red: number;
  green: number;
  blue: number;
};

export class Palette {
  private static requestId = 0;
  private static source: string | null = null;
  private static cache = new Map<string, PaletteColors>();

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

    const requestId = ++this.requestId;

    try {
      const colors =
        this.getCachedPalette(image) ?? (await this.extractPalette(image));
      if (requestId !== this.requestId) return;

      this.cachePalette(image, colors);
      this.applyColors(colors);
      this.source = image;
    } catch {
      if (requestId !== this.requestId) return;

      this.source = null;
      this.clearAppliedPalette();
    }
  }

  private static async extractPalette(source: string): Promise<PaletteColors> {
    const image = await this.loadImage(source);
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas context unavailable');

    context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const pixels = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
    const primary = this.averageColor(pixels);

    return {
      primary: this.toHex(primary),
      light: this.toHex(
        this.mix(primary, { red: 255, green: 255, blue: 255 }, 0.32),
      ),
      dark: this.toHex(this.mix(primary, { red: 0, green: 0, blue: 0 }, 0.52)),
    };
  }

  private static loadImage(source: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load cover image'));
      image.src = source;
    });
  }

  private static averageColor(pixels: Uint8ClampedArray): Rgb {
    let red = 0;
    let green = 0;
    let blue = 0;
    let weight = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3] / 255;
      if (alpha < 0.5) continue;

      const pixelRed = pixels[index];
      const pixelGreen = pixels[index + 1];
      const pixelBlue = pixels[index + 2];
      const highest = Math.max(pixelRed, pixelGreen, pixelBlue);
      const lowest = Math.min(pixelRed, pixelGreen, pixelBlue);
      const saturation = (highest - lowest) / 255;
      const luminance =
        (0.2126 * pixelRed + 0.7152 * pixelGreen + 0.0722 * pixelBlue) / 255;

      if (luminance < 0.06 || luminance > 0.96) continue;

      const pixelWeight = alpha * (1 + saturation * 2);
      red += pixelRed * pixelWeight;
      green += pixelGreen * pixelWeight;
      blue += pixelBlue * pixelWeight;
      weight += pixelWeight;
    }

    if (weight === 0) {
      throw new Error('Cover image has no usable pixels');
    }

    return {
      red: Math.round(red / weight),
      green: Math.round(green / weight),
      blue: Math.round(blue / weight),
    };
  }

  private static mix(from: Rgb, to: Rgb, amount: number): Rgb {
    return {
      red: Math.round(from.red + (to.red - from.red) * amount),
      green: Math.round(from.green + (to.green - from.green) * amount),
      blue: Math.round(from.blue + (to.blue - from.blue) * amount),
    };
  }

  private static toHex({ red, green, blue }: Rgb): string {
    return `#${[red, green, blue]
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('')}`;
  }

  private static getCachedPalette(source: string): PaletteColors | null {
    const colors = this.cache.get(source);
    if (!colors) return null;

    this.cache.delete(source);
    this.cache.set(source, colors);
    return colors;
  }

  private static cachePalette(source: string, colors: PaletteColors) {
    this.cache.set(source, colors);

    while (this.cache.size > MAX_CACHED_PALETTES) {
      const oldestSource = this.cache.keys().next().value as string | undefined;
      if (!oldestSource) return;
      this.cache.delete(oldestSource);
    }
  }

  private static applyColors(colors: PaletteColors) {
    const root = document.documentElement;
    root.style.setProperty('--luminous-palette-primary', colors.primary);
    root.style.setProperty('--luminous-palette-light', colors.light);
    root.style.setProperty('--luminous-palette-dark', colors.dark);
    root.classList.add(PALETTE_CLASS);
  }

  private static clearAppliedPalette() {
    const root = document.documentElement;
    PALETTE_VARIABLES.forEach((variable) => {
      root.style.removeProperty(variable);
    });
    root.classList.remove(PALETTE_CLASS);
  }
}
