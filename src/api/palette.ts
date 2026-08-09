const PALETTE_CLASS = 'luminous-dynamic-palette';
const PALETTE_VARIABLES = [
  '--luminous-palette-primary',
  '--luminous-palette-secondary',
  '--luminous-palette-accent',
  '--luminous-palette-light',
  '--luminous-palette-dark',
  '--luminous-effect-angle',
  '--luminous-effect-saturation',
  '--luminous-effect-brightness',
  '--luminous-effect-contrast',
  '--luminous-blob-1-duration',
  '--luminous-blob-2-duration',
  '--luminous-blob-3-duration',
  '--luminous-blob-4-duration',
] as const;
const EFFECT_CLASSES = [
  'luminous-effect-aurora',
  'luminous-effect-ember',
  'luminous-effect-bloom',
  'luminous-effect-prism',
  'luminous-effect-halo',
  'luminous-effect-energy-soft',
  'luminous-effect-energy-flow',
  'luminous-effect-energy-vivid',
  'luminous-effect-tone-dark',
  'luminous-effect-tone-balanced',
  'luminous-effect-tone-light',
] as const;
const SAMPLE_SIZE = 48;
const MAX_CACHED_PALETTES = 24;
const DEFAULT_MOTION_DURATION = 20;

type EffectScene = 'aurora' | 'ember' | 'bloom' | 'prism' | 'halo';
type EffectEnergy = 'soft' | 'flow' | 'vivid';
type EffectTone = 'dark' | 'balanced' | 'light';

type PaletteProfile = {
  primary: string;
  secondary: string;
  accent: string;
  light: string;
  dark: string;
  scene: EffectScene;
  energy: EffectEnergy;
  tone: EffectTone;
  angle: number;
  saturation: number;
  brightness: number;
  contrast: number;
  baseDurations: [number, number, number, number];
};

type Rgb = {
  red: number;
  green: number;
  blue: number;
};

type Hsl = {
  hue: number;
  saturation: number;
  lightness: number;
};

type ColorBucket = {
  red: number;
  green: number;
  blue: number;
  weight: number;
};

type ColorCandidate = {
  rgb: Rgb;
  hsl: Hsl;
  score: number;
};

type ImageMetrics = {
  averageSaturation: number;
  averageLightness: number;
  contrast: number;
  hueDiversity: number;
  warmth: number;
};

export class Palette {
  private static requestId = 0;
  private static source: string | null = null;
  private static cache = new Map<string, PaletteProfile>();
  private static currentProfile: PaletteProfile | null = null;
  private static motionScale = 1;

  static cancel() {
    this.requestId++;
  }

  static clear() {
    this.cancel();
    this.source = null;
    this.currentProfile = null;
    this.clearAppliedPalette();
  }

  static setMotionDuration(duration: number) {
    const normalized = Number.isFinite(duration)
      ? Math.min(48, Math.max(8, duration))
      : DEFAULT_MOTION_DURATION;

    this.motionScale = normalized / DEFAULT_MOTION_DURATION;

    if (this.currentProfile) {
      this.applyDurations(this.currentProfile.baseDurations);
    }
  }

  static async applyFromImage(image: string | null | undefined) {
    if (!image) {
      this.clear();
      return;
    }

    if (image === this.source && this.currentProfile) {
      if (this.hasAppliedPalette()) return;
      this.applyProfile(this.currentProfile);
      return;
    }

    const requestId = ++this.requestId;

    try {
      const profile =
        this.getCachedPalette(image) ?? (await this.extractProfile(image));
      if (requestId !== this.requestId) return;

      this.cachePalette(image, profile);
      this.applyProfile(profile);
      this.source = image;
    } catch (error) {
      if (requestId !== this.requestId) return;

      this.source = null;
      this.currentProfile = null;
      this.clearAppliedPalette();
      Luminous.Logger.warn(
        'Palette',
        'Failed to create adaptive background effects',
        error,
      );
    }
  }

  private static async extractProfile(source: string): Promise<PaletteProfile> {
    const image = await this.loadImage(source);
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas context unavailable');

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

    const pixels = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
    return this.analyzePixels(pixels);
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

  private static analyzePixels(pixels: Uint8ClampedArray): PaletteProfile {
    const buckets = new Map<string, ColorBucket>();
    let totalWeight = 0;
    let redTotal = 0;
    let greenTotal = 0;
    let blueTotal = 0;
    let saturationTotal = 0;
    let lightnessTotal = 0;
    let lightnessSquaredTotal = 0;
    let warmthTotal = 0;
    let hueX = 0;
    let hueY = 0;
    let hueWeight = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3] / 255;
      if (alpha < 0.45) continue;

      const rgb = {
        red: pixels[index],
        green: pixels[index + 1],
        blue: pixels[index + 2],
      };
      const hsl = this.rgbToHsl(rgb);
      const metricWeight = alpha * (0.62 + hsl.saturation * 0.78);

      totalWeight += metricWeight;
      redTotal += rgb.red * metricWeight;
      greenTotal += rgb.green * metricWeight;
      blueTotal += rgb.blue * metricWeight;
      saturationTotal += hsl.saturation * metricWeight;
      lightnessTotal += hsl.lightness * metricWeight;
      lightnessSquaredTotal += hsl.lightness * hsl.lightness * metricWeight;
      warmthTotal +=
        ((rgb.red - rgb.blue) / 255 + ((rgb.green - rgb.blue) / 255) * 0.28) *
        metricWeight;

      if (
        hsl.saturation > 0.08 &&
        hsl.lightness > 0.04 &&
        hsl.lightness < 0.96
      ) {
        const angle = hsl.hue * Math.PI * 2;
        const chromaWeight = metricWeight * hsl.saturation;
        hueX += Math.cos(angle) * chromaWeight;
        hueY += Math.sin(angle) * chromaWeight;
        hueWeight += chromaWeight;
      }

      if (hsl.lightness < 0.025 || hsl.lightness > 0.975) continue;

      const key = `${rgb.red >> 5}:${rgb.green >> 5}:${rgb.blue >> 5}`;
      const colorWeight =
        metricWeight *
        (0.72 + hsl.saturation * 0.96) *
        (0.82 + (1 - Math.abs(hsl.lightness - 0.52)) * 0.34);
      const bucket = buckets.get(key) ?? {
        red: 0,
        green: 0,
        blue: 0,
        weight: 0,
      };

      bucket.red += rgb.red * colorWeight;
      bucket.green += rgb.green * colorWeight;
      bucket.blue += rgb.blue * colorWeight;
      bucket.weight += colorWeight;
      buckets.set(key, bucket);
    }

    if (totalWeight === 0) {
      throw new Error('Cover image has no usable pixels');
    }

    if (buckets.size === 0) {
      buckets.set('fallback', {
        red: redTotal,
        green: greenTotal,
        blue: blueTotal,
        weight: totalWeight,
      });
    }

    const averageLightness = lightnessTotal / totalWeight;
    const lightnessVariance = Math.max(
      0,
      lightnessSquaredTotal / totalWeight - averageLightness ** 2,
    );
    const hueConcentration =
      hueWeight > 0 ? Math.hypot(hueX, hueY) / hueWeight : 1;
    const metrics: ImageMetrics = {
      averageSaturation: saturationTotal / totalWeight,
      averageLightness,
      contrast: Math.min(1, Math.sqrt(lightnessVariance) / 0.3),
      hueDiversity: Math.min(1, Math.max(0, 1 - hueConcentration)),
      warmth: warmthTotal / totalWeight,
    };

    const candidates = Array.from(buckets.values())
      .map((bucket): ColorCandidate => {
        const rgb = {
          red: Math.round(bucket.red / bucket.weight),
          green: Math.round(bucket.green / bucket.weight),
          blue: Math.round(bucket.blue / bucket.weight),
        };

        return {
          rgb,
          hsl: this.rgbToHsl(rgb),
          score: bucket.weight,
        };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 36);

    const primaryCandidate = candidates.reduce((best, candidate) => {
      const candidateScore =
        candidate.score * (0.82 + candidate.hsl.saturation * 0.5);
      const bestScore = best.score * (0.82 + best.hsl.saturation * 0.5);
      return candidateScore > bestScore ? candidate : best;
    });
    const secondaryCandidate = this.selectDistinctColor(
      candidates,
      [primaryCandidate],
      0.14,
    );
    const accentCandidate = this.selectDistinctColor(
      candidates,
      [primaryCandidate, secondaryCandidate],
      0.1,
    );

    const visualChroma = this.getVisualChroma(
      primaryCandidate.hsl.saturation,
      metrics,
    );
    const scene = this.selectScene(
      primaryCandidate.hsl.hue,
      visualChroma,
      metrics,
    );
    const energy = this.selectEnergy(visualChroma, metrics);
    const tone = this.selectTone(metrics.averageLightness);
    const { primary, secondary, accent } = this.createSceneColors(
      scene,
      primaryCandidate,
      secondaryCandidate,
      accentCandidate,
    );
    const brightest = [primary, secondary, accent].reduce((best, color) =>
      this.relativeLuminance(color) > this.relativeLuminance(best)
        ? color
        : best,
    );
    const darkest = [primary, secondary, accent].reduce((best, color) =>
      this.relativeLuminance(color) < this.relativeLuminance(best)
        ? color
        : best,
    );

    return {
      primary: this.toHex(primary),
      secondary: this.toHex(secondary),
      accent: this.toHex(accent),
      light: this.toHex(
        this.mix(brightest, { red: 255, green: 255, blue: 255 }, 0.34),
      ),
      dark: this.toHex(this.mix(darkest, { red: 0, green: 0, blue: 0 }, 0.62)),
      scene,
      energy,
      tone,
      angle: Math.round(primaryCandidate.hsl.hue * 360),
      saturation: Number(
        (0.92 + Math.min(0.68, visualChroma * 0.9)).toFixed(2),
      ),
      brightness: tone === 'dark' ? 1.08 : tone === 'light' ? 0.9 : 1,
      contrast: Number((0.94 + metrics.contrast * 0.16).toFixed(2)),
      baseDurations: this.getBaseDurations(energy),
    };
  }

  private static selectDistinctColor(
    candidates: ColorCandidate[],
    anchors: ColorCandidate[],
    minimumDistance: number,
  ): ColorCandidate {
    const maxScore = candidates[0]?.score ?? 1;
    let selected = candidates[0];
    let selectedScore = -Infinity;

    candidates.forEach((candidate) => {
      const distance = Math.min(
        ...anchors.map((anchor) =>
          this.colorDistance(candidate.rgb, anchor.rgb),
        ),
      );
      if (distance < minimumDistance) return;

      const luminanceContrast = Math.max(
        ...anchors.map((anchor) =>
          Math.abs(candidate.hsl.lightness - anchor.hsl.lightness),
        ),
      );
      const score =
        (candidate.score / maxScore) * 0.46 +
        distance * 0.42 +
        luminanceContrast * 0.12;

      if (score > selectedScore) {
        selected = candidate;
        selectedScore = score;
      }
    });

    if (selectedScore > -Infinity) return selected;

    const anchor = anchors[anchors.length - 1];
    const fallbackHsl = {
      hue: (anchor.hsl.hue + 0.42) % 1,
      saturation: Math.max(0.28, anchor.hsl.saturation),
      lightness: Math.min(
        0.72,
        Math.max(0.28, 1 - anchor.hsl.lightness * 0.72),
      ),
    };

    return {
      rgb: this.hslToRgb(fallbackHsl),
      hsl: fallbackHsl,
      score: 0,
    };
  }

  private static createSceneColors(
    scene: EffectScene,
    primaryCandidate: ColorCandidate,
    secondaryCandidate: ColorCandidate,
    accentCandidate: ColorCandidate,
  ): { primary: Rgb; secondary: Rgb; accent: Rgb } {
    if (scene === 'halo') {
      const primary = this.normalizeColor(primaryCandidate.rgb, 0, 0.22, 0.72);
      const primaryHsl = this.rgbToHsl(primary);
      const neutralHue = primaryHsl.saturation > 0.05 ? primaryHsl.hue : 0.61;

      return {
        primary,
        secondary: this.mix(primary, { red: 255, green: 255, blue: 255 }, 0.3),
        accent: this.hslToRgb({
          hue: neutralHue,
          saturation: Math.max(0.08, primaryHsl.saturation * 0.72),
          lightness: Math.min(
            0.74,
            Math.max(0.38, primaryHsl.lightness + 0.12),
          ),
        }),
      };
    }

    const harmonyOffsets: Record<
      Exclude<EffectScene, 'halo'>,
      [number, number]
    > = {
      aurora: [-0.12, -0.22],
      ember: [0.08, 0.14],
      bloom: [0.1, 0.2],
      prism: [0.33, 0.66],
    };
    const [secondaryOffset, accentOffset] = harmonyOffsets[scene];
    const secondarySource =
      secondaryCandidate.score > 0
        ? secondaryCandidate.rgb
        : this.createHarmonyColor(primaryCandidate.hsl, secondaryOffset, 0.5);
    const accentSource =
      accentCandidate.score > 0
        ? accentCandidate.rgb
        : this.createHarmonyColor(primaryCandidate.hsl, accentOffset, 0.58);

    return {
      primary: this.normalizeColor(primaryCandidate.rgb, 0.34, 0.24, 0.74),
      secondary: this.normalizeColor(secondarySource, 0.38, 0.2, 0.78),
      accent: this.normalizeColor(accentSource, 0.46, 0.34, 0.78),
    };
  }

  private static createHarmonyColor(
    anchor: Hsl,
    hueOffset: number,
    minimumSaturation: number,
  ): Rgb {
    return this.hslToRgb({
      hue: (anchor.hue + hueOffset + 1) % 1,
      saturation: Math.max(minimumSaturation, anchor.saturation),
      lightness: Math.min(0.7, Math.max(0.38, anchor.lightness + 0.08)),
    });
  }

  private static getVisualChroma(
    dominantSaturation: number,
    metrics: ImageMetrics,
  ): number {
    const accentContribution =
      dominantSaturation * (0.52 + metrics.contrast * 0.24);
    return Math.min(1, Math.max(metrics.averageSaturation, accentContribution));
  }

  private static selectScene(
    dominantHue: number,
    visualChroma: number,
    metrics: ImageMetrics,
  ): EffectScene {
    if (visualChroma < 0.18) return 'halo';
    if (metrics.hueDiversity > 0.43 && visualChroma > 0.38) {
      return 'prism';
    }

    const hueDegrees = dominantHue * 360;
    if (hueDegrees >= 68 && hueDegrees < 166) return 'bloom';

    if (metrics.warmth > 0.08 || hueDegrees < 58 || hueDegrees >= 334) {
      return 'ember';
    }

    return 'aurora';
  }

  private static selectEnergy(
    visualChroma: number,
    metrics: ImageMetrics,
  ): EffectEnergy {
    if (visualChroma < 0.18) return 'soft';

    const score =
      visualChroma * 0.48 +
      metrics.contrast * 0.34 +
      metrics.hueDiversity * 0.18;

    if (score < 0.34) return 'soft';
    if (score < 0.57) return 'flow';
    return 'vivid';
  }

  private static selectTone(averageLightness: number): EffectTone {
    if (averageLightness < 0.31) return 'dark';
    if (averageLightness > 0.68) return 'light';
    return 'balanced';
  }

  private static getBaseDurations(
    energy: EffectEnergy,
  ): [number, number, number, number] {
    if (energy === 'soft') return [42, 51, 60, 70];
    if (energy === 'vivid') return [14, 18, 23, 29];
    return [24, 31, 38, 46];
  }

  private static normalizeColor(
    rgb: Rgb,
    minimumSaturation: number,
    minimumLightness: number,
    maximumLightness: number,
  ): Rgb {
    const hsl = this.rgbToHsl(rgb);
    return this.hslToRgb({
      hue: hsl.hue,
      saturation: Math.max(minimumSaturation, hsl.saturation),
      lightness: Math.min(
        maximumLightness,
        Math.max(minimumLightness, hsl.lightness),
      ),
    });
  }

  private static rgbToHsl({ red, green, blue }: Rgb): Hsl {
    const normalizedRed = red / 255;
    const normalizedGreen = green / 255;
    const normalizedBlue = blue / 255;
    const maximum = Math.max(normalizedRed, normalizedGreen, normalizedBlue);
    const minimum = Math.min(normalizedRed, normalizedGreen, normalizedBlue);
    const delta = maximum - minimum;
    const lightness = (maximum + minimum) / 2;

    if (delta === 0) {
      return { hue: 0, saturation: 0, lightness };
    }

    const saturation = delta / (1 - Math.abs(2 * lightness - 1));
    let hue: number;

    if (maximum === normalizedRed) {
      hue = ((normalizedGreen - normalizedBlue) / delta) % 6;
    } else if (maximum === normalizedGreen) {
      hue = (normalizedBlue - normalizedRed) / delta + 2;
    } else {
      hue = (normalizedRed - normalizedGreen) / delta + 4;
    }

    return {
      hue: ((hue * 60 + 360) % 360) / 360,
      saturation,
      lightness,
    };
  }

  private static hslToRgb({ hue, saturation, lightness }: Hsl): Rgb {
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const hueSection = (hue * 360) / 60;
    const secondary = chroma * (1 - Math.abs((hueSection % 2) - 1));
    const offset = lightness - chroma / 2;
    let red = 0;
    let green = 0;
    let blue = 0;

    if (hueSection < 1) {
      red = chroma;
      green = secondary;
    } else if (hueSection < 2) {
      red = secondary;
      green = chroma;
    } else if (hueSection < 3) {
      green = chroma;
      blue = secondary;
    } else if (hueSection < 4) {
      green = secondary;
      blue = chroma;
    } else if (hueSection < 5) {
      red = secondary;
      blue = chroma;
    } else {
      red = chroma;
      blue = secondary;
    }

    return {
      red: Math.round((red + offset) * 255),
      green: Math.round((green + offset) * 255),
      blue: Math.round((blue + offset) * 255),
    };
  }

  private static colorDistance(left: Rgb, right: Rgb): number {
    const red = (left.red - right.red) / 255;
    const green = (left.green - right.green) / 255;
    const blue = (left.blue - right.blue) / 255;

    return Math.min(
      1,
      Math.sqrt(red * red * 0.3 + green * green * 0.59 + blue * blue * 0.11),
    );
  }

  private static relativeLuminance({ red, green, blue }: Rgb): number {
    return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
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

  private static getCachedPalette(source: string): PaletteProfile | null {
    const profile = this.cache.get(source);
    if (!profile) return null;

    this.cache.delete(source);
    this.cache.set(source, profile);
    return profile;
  }

  private static cachePalette(source: string, profile: PaletteProfile) {
    this.cache.set(source, profile);

    while (this.cache.size > MAX_CACHED_PALETTES) {
      const oldestSource = this.cache.keys().next().value as string | undefined;
      if (!oldestSource) return;
      this.cache.delete(oldestSource);
    }
  }

  private static applyProfile(profile: PaletteProfile) {
    this.currentProfile = profile;
    const root = this.getTarget();
    if (!root) return;
    root.style.setProperty('--luminous-palette-primary', profile.primary);
    root.style.setProperty('--luminous-palette-secondary', profile.secondary);
    root.style.setProperty('--luminous-palette-accent', profile.accent);
    root.style.setProperty('--luminous-palette-light', profile.light);
    root.style.setProperty('--luminous-palette-dark', profile.dark);
    root.style.setProperty('--luminous-effect-angle', `${profile.angle}deg`);
    root.style.setProperty(
      '--luminous-effect-saturation',
      String(profile.saturation),
    );
    root.style.setProperty(
      '--luminous-effect-brightness',
      String(profile.brightness),
    );
    root.style.setProperty(
      '--luminous-effect-contrast',
      String(profile.contrast),
    );

    root.classList.remove(...EFFECT_CLASSES);
    root.classList.add(
      `luminous-effect-${profile.scene}`,
      `luminous-effect-energy-${profile.energy}`,
      `luminous-effect-tone-${profile.tone}`,
      PALETTE_CLASS,
    );

    this.applyDurations(profile.baseDurations);
  }

  private static applyDurations(durations: [number, number, number, number]) {
    const root = this.getTarget();
    if (!root) return;

    durations.forEach((duration, index) => {
      const scaled = Math.max(7, duration * this.motionScale);
      root.style.setProperty(
        `--luminous-blob-${index + 1}-duration`,
        `${Number(scaled.toFixed(1))}s`,
      );
    });
  }

  private static clearAppliedPalette() {
    const root = this.getTarget();
    if (!root) return;

    PALETTE_VARIABLES.forEach((variable) => {
      root.style.removeProperty(variable);
    });
    root.classList.remove(...EFFECT_CLASSES, PALETTE_CLASS);
  }

  private static getTarget(): HTMLElement | null {
    return document.querySelector('.luminous-background-effects');
  }

  private static hasAppliedPalette(): boolean {
    return this.getTarget()?.classList.contains(PALETTE_CLASS) === true;
  }
}
