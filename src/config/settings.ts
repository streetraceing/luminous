import type {
  SettingDefinition,
  SettingValue,
} from '../types/runtime/settings.types';

export const motionModes = ['still', 'drift', 'float', 'orbit'] as const;
export type MotionMode = (typeof motionModes)[number];

export const backgroundSources = ['auto', 'artwork'] as const;
export type BackgroundSource = (typeof backgroundSources)[number];

export const effectQualities = ['full', 'balanced', 'lite'] as const;
export type EffectQuality = (typeof effectQualities)[number];

export type LuminousSettingValues = {
  dynamicBackground: boolean;
  backgroundSource: BackgroundSource;
  dynamicPalette: boolean;
  backgroundBlur: number;
  backgroundBrightness: number;
  uiOpacity: number;
  uiBlur: number;
  paletteStrength: number;
  vignetteStrength: number;
  grainStrength: number;
  glassHighlights: boolean;
  backgroundMotion: MotionMode;
  motionDuration: number;
  transitionDuration: number;
  parallax: boolean;
  parallaxStrength: number;
  reduceMotion: boolean;
  respectSystemMotion: boolean;
  pauseWhenHidden: boolean;
  effectQuality: EffectQuality;
  backgroundEnergy: 'adaptive';
};

export type LuminousSettingKey = keyof LuminousSettingValues;

export type SettingUiDefinition = {
  key: LuminousSettingKey;
  label: string;
  description: string;
  section: 'appearance' | 'motion' | 'advanced';
  control: 'toggle' | 'range' | 'choice';
  min?: number;
  max?: number;
  step?: number;
  unit?: 'px' | '%' | 's' | 'ms';
  options?: ReadonlyArray<{ value: string; label: string }>;
};

const numberNormalizer = (fallback: number, min: number, max: number) => {
  return (value: unknown): number => {
    if (typeof value !== 'number' && typeof value !== 'string') return fallback;
    if (typeof value === 'string' && value.trim() === '') return fallback;

    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) return fallback;

    return Math.min(max, Math.max(min, parsed));
  };
};

const booleanNormalizer = (fallback: boolean) => {
  return (value: unknown): boolean =>
    typeof value === 'boolean' ? value : fallback;
};

const choiceNormalizer = <T extends string>(
  values: readonly T[],
  fallback: T,
) => {
  return (value: unknown): T =>
    typeof value === 'string' && values.includes(value as T)
      ? (value as T)
      : fallback;
};

const toggleExclusiveClasses = (
  prefix: string,
  values: readonly string[],
  active: string,
) => {
  values.forEach((value) => {
    Luminous.Settings.toggleClass(`${prefix}${value}`, value === active);
  });
};

export const settingDefinitions: {
  [K in LuminousSettingKey]: SettingDefinition<LuminousSettingValues[K]>;
} = {
  backgroundBlur: {
    default: 24,
    normalize: numberNormalizer(24, 0, 48),
    apply: (value) =>
      Luminous.Settings.setVar('--luminous-background-blur', `${value}px`),
  },
  backgroundBrightness: {
    default: 75,
    normalize: numberNormalizer(75, 30, 120),
    apply: (value) =>
      Luminous.Settings.setVar(
        '--luminous-background-brightness',
        String(value / 100),
      ),
  },
  uiBlur: {
    default: 16,
    normalize: numberNormalizer(16, 0, 32),
    apply: (value) =>
      Luminous.Settings.setVar('--luminous-ui-blur', `${value}px`),
  },
  paletteStrength: {
    default: 24,
    normalize: numberNormalizer(24, 0, 50),
    apply: (value) => {
      const opacity = Math.min(78, Math.round(value * 1.6));
      Luminous.Settings.setVar(
        '--luminous-palette-effect-opacity',
        `${opacity}%`,
      );
    },
  },
  vignetteStrength: {
    default: 28,
    normalize: numberNormalizer(28, 0, 70),
    apply: (value) =>
      Luminous.Settings.setVar('--luminous-vignette-opacity', `${value}%`),
  },
  grainStrength: {
    default: 5,
    normalize: numberNormalizer(5, 0, 20),
    apply: (value) =>
      Luminous.Settings.setVar('--luminous-grain-opacity', `${value}%`),
  },
  glassHighlights: {
    default: true,
    normalize: booleanNormalizer(true),
    apply: (value) =>
      Luminous.Settings.toggleClass('luminous-glass-highlights', value),
  },
  backgroundEnergy: {
    default: 'adaptive',
    normalize: () => 'adaptive',
  },
  uiOpacity: {
    default: 50,
    normalize: numberNormalizer(50, 0, 100),
    apply: (value) => {
      if (Luminous.Settings.get<boolean>('dynamicBackground') === false) {
        Luminous.Settings.removeVar('--luminous-ui-opacity');
        return;
      }

      Luminous.Settings.setVar('--luminous-ui-opacity', `${value}%`);
    },
  },
  dynamicBackground: {
    default: true,
    normalize: booleanNormalizer(true),
    apply: (value) => {
      Luminous.Settings.toggleClass('hideDynamicBackground', !value);

      if (value) {
        Luminous.Settings.setVar('--luminous-background', 'transparent');
        Luminous.Settings.setVar('--luminous-ui-base', 'var(--spice-sidebar)');
        Luminous.Settings.setVar(
          '--luminous-ui-opacity',
          `${Luminous.Settings.get<number>('uiOpacity') ?? 50}%`,
        );
        return;
      }

      Luminous.Settings.removeVar('--luminous-background');
      Luminous.Settings.removeVar('--luminous-ui-base');
      Luminous.Settings.removeVar('--luminous-ui-opacity');
    },
  },
  backgroundSource: {
    default: 'auto',
    normalize: choiceNormalizer(backgroundSources, 'auto'),
    apply: (value) => {
      toggleExclusiveClasses('luminous-source-', backgroundSources, value);
      Luminous.Canvas.setEnabled(value === 'auto');
    },
  },
  dynamicPalette: {
    default: true,
    normalize: booleanNormalizer(true),
    apply: (value) => {
      if (!value) Luminous.Palette.clear();
    },
  },
  backgroundMotion: {
    default: 'drift',
    normalize: choiceNormalizer(motionModes, 'drift'),
    apply: (value) =>
      toggleExclusiveClasses('luminous-motion-', motionModes, value),
  },
  motionDuration: {
    default: 20,
    normalize: numberNormalizer(20, 8, 60),
    apply: (value) => {
      Luminous.Settings.setVar('--luminous-motion-duration', `${value}s`);
      Luminous.Palette.setMotionDuration(value);
    },
  },
  transitionDuration: {
    default: 420,
    normalize: numberNormalizer(420, 0, 1200),
    apply: (value) => {
      Luminous.Settings.setVar('--luminous-transition-duration', `${value}ms`);
      Luminous.Background.setTransitionDuration(value);
    },
  },
  parallax: {
    default: true,
    normalize: booleanNormalizer(true),
    apply: (value) =>
      Luminous.Settings.toggleClass('luminous-parallax-enabled', value),
  },
  parallaxStrength: {
    default: 8,
    normalize: numberNormalizer(8, 0, 20),
    apply: (value) =>
      Luminous.Settings.setVar('--luminous-parallax-strength', `${value}px`),
  },
  reduceMotion: {
    default: false,
    normalize: booleanNormalizer(false),
  },
  respectSystemMotion: {
    default: true,
    normalize: booleanNormalizer(true),
  },
  pauseWhenHidden: {
    default: true,
    normalize: booleanNormalizer(true),
  },
  effectQuality: {
    default: 'full',
    normalize: choiceNormalizer(effectQualities, 'full'),
    apply: (value) =>
      toggleExclusiveClasses('luminous-quality-', effectQualities, value),
  },
};

export const settingsUi: readonly SettingUiDefinition[] = [
  {
    key: 'dynamicBackground',
    label: 'Dynamic background',
    description: 'Use artwork or Spotify video behind the interface.',
    section: 'appearance',
    control: 'toggle',
  },
  {
    key: 'backgroundSource',
    label: 'Background source',
    description: 'Prefer Spotify video automatically, or always use artwork.',
    section: 'appearance',
    control: 'choice',
    options: [
      { value: 'auto', label: 'Auto' },
      { value: 'artwork', label: 'Artwork' },
    ],
  },
  {
    key: 'dynamicPalette',
    label: 'Adaptive effects',
    description: 'Build a colour scene automatically from each track cover.',
    section: 'appearance',
    control: 'toggle',
  },
  {
    key: 'backgroundBlur',
    label: 'Background blur',
    description: 'Softens artwork and video behind Spotify.',
    section: 'appearance',
    control: 'range',
    min: 0,
    max: 48,
    step: 1,
    unit: 'px',
  },
  {
    key: 'backgroundBrightness',
    label: 'Background brightness',
    description: 'Controls how prominent the media remains.',
    section: 'appearance',
    control: 'range',
    min: 30,
    max: 120,
    step: 1,
    unit: '%',
  },
  {
    key: 'uiOpacity',
    label: 'Surface opacity',
    description: 'Sets the density of translucent Spotify surfaces.',
    section: 'appearance',
    control: 'range',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
  },
  {
    key: 'uiBlur',
    label: 'Surface blur',
    description: 'Controls the glass blur applied to interface surfaces.',
    section: 'appearance',
    control: 'range',
    min: 0,
    max: 32,
    step: 1,
    unit: 'px',
  },
  {
    key: 'paletteStrength',
    label: 'Effect intensity',
    description: 'Controls how strongly adaptive light appears.',
    section: 'appearance',
    control: 'range',
    min: 0,
    max: 50,
    step: 1,
    unit: '%',
  },
  {
    key: 'vignetteStrength',
    label: 'Edge vignette',
    description: 'Darkens the edges for stronger foreground contrast.',
    section: 'appearance',
    control: 'range',
    min: 0,
    max: 70,
    step: 1,
    unit: '%',
  },
  {
    key: 'grainStrength',
    label: 'Film grain',
    description: 'Adds subtle animated texture to the lighting.',
    section: 'appearance',
    control: 'range',
    min: 0,
    max: 20,
    step: 1,
    unit: '%',
  },
  {
    key: 'glassHighlights',
    label: 'Glass highlights',
    description: 'Adds a faint light edge to the main glass surfaces.',
    section: 'appearance',
    control: 'toggle',
  },
  {
    key: 'backgroundMotion',
    label: 'Background movement',
    description: 'Choose the motion path used by media and light.',
    section: 'motion',
    control: 'choice',
    options: [
      { value: 'still', label: 'Still' },
      { value: 'drift', label: 'Drift' },
      { value: 'float', label: 'Float' },
      { value: 'orbit', label: 'Orbit' },
    ],
  },
  {
    key: 'motionDuration',
    label: 'Motion speed',
    description: 'Scales the media movement and adaptive scene tempo.',
    section: 'motion',
    control: 'range',
    min: 8,
    max: 60,
    step: 1,
    unit: 's',
  },
  {
    key: 'transitionDuration',
    label: 'Cross-fade',
    description: 'Sets how quickly backgrounds and lighting morph.',
    section: 'motion',
    control: 'range',
    min: 0,
    max: 1200,
    step: 20,
    unit: 'ms',
  },
  {
    key: 'parallax',
    label: 'Pointer parallax',
    description: 'Lets the lighting follow the pointer with gentle depth.',
    section: 'motion',
    control: 'toggle',
  },
  {
    key: 'parallaxStrength',
    label: 'Parallax depth',
    description: 'Controls how far the ambient background follows the pointer.',
    section: 'motion',
    control: 'range',
    min: 0,
    max: 20,
    step: 1,
    unit: 'px',
  },
  {
    key: 'reduceMotion',
    label: 'Reduce motion',
    description: 'Stops Luminous animation regardless of system preference.',
    section: 'motion',
    control: 'toggle',
  },
  {
    key: 'respectSystemMotion',
    label: 'Respect system motion',
    description: 'Also reduce motion when the operating system asks for it.',
    section: 'motion',
    control: 'toggle',
  },
  {
    key: 'effectQuality',
    label: 'Effect detail',
    description: 'Trade richer animated lighting for lower GPU work.',
    section: 'advanced',
    control: 'choice',
    options: [
      { value: 'full', label: 'Full' },
      { value: 'balanced', label: 'Balanced' },
      { value: 'lite', label: 'Lite' },
    ],
  },
  {
    key: 'pauseWhenHidden',
    label: 'Pause when hidden',
    description: 'Pause custom Luminous motion while Spotify is hidden.',
    section: 'advanced',
    control: 'toggle',
  },
] as const;

export type VisualPresetId = 'balanced' | 'cinematic' | 'calm' | 'performance';

export type VisualPreset = {
  id: VisualPresetId;
  label: string;
  description: string;
  values: Partial<LuminousSettingValues>;
};

export const visualPresets: readonly VisualPreset[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'The default Luminous balance of clarity, colour, and motion.',
    values: {
      dynamicBackground: true,
      backgroundSource: 'auto',
      dynamicPalette: true,
      backgroundBlur: 24,
      backgroundBrightness: 75,
      uiOpacity: 50,
      uiBlur: 16,
      paletteStrength: 24,
      vignetteStrength: 28,
      grainStrength: 5,
      glassHighlights: true,
      backgroundMotion: 'drift',
      motionDuration: 20,
      transitionDuration: 420,
      parallax: true,
      parallaxStrength: 8,
      effectQuality: 'full',
    },
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    description:
      'Brighter media, deeper colour, slower transitions, more depth.',
    values: {
      dynamicBackground: true,
      backgroundSource: 'auto',
      dynamicPalette: true,
      backgroundBlur: 16,
      backgroundBrightness: 88,
      uiOpacity: 38,
      uiBlur: 20,
      paletteStrength: 36,
      vignetteStrength: 36,
      grainStrength: 7,
      glassHighlights: true,
      backgroundMotion: 'orbit',
      motionDuration: 26,
      transitionDuration: 620,
      parallax: true,
      parallaxStrength: 11,
      effectQuality: 'full',
    },
  },
  {
    id: 'calm',
    label: 'Calm',
    description: 'Soft, subdued lighting with minimal movement.',
    values: {
      dynamicBackground: true,
      backgroundSource: 'artwork',
      dynamicPalette: true,
      backgroundBlur: 36,
      backgroundBrightness: 62,
      uiOpacity: 68,
      uiBlur: 18,
      paletteStrength: 14,
      vignetteStrength: 22,
      grainStrength: 2,
      glassHighlights: false,
      backgroundMotion: 'still',
      transitionDuration: 360,
      parallax: false,
      effectQuality: 'balanced',
    },
  },
  {
    id: 'performance',
    label: 'Performance',
    description: 'Artwork-only mode with reduced effect complexity and motion.',
    values: {
      dynamicBackground: true,
      backgroundSource: 'artwork',
      dynamicPalette: true,
      backgroundBlur: 18,
      backgroundBrightness: 72,
      uiOpacity: 72,
      uiBlur: 10,
      paletteStrength: 10,
      vignetteStrength: 20,
      grainStrength: 0,
      glassHighlights: false,
      backgroundMotion: 'still',
      transitionDuration: 220,
      parallax: false,
      effectQuality: 'lite',
      pauseWhenHidden: true,
    },
  },
] as const;

export function registerLuminousSettings(): void {
  (
    Object.entries(settingDefinitions) as Array<
      [LuminousSettingKey, SettingDefinition<SettingValue>]
    >
  ).forEach(([key, definition]) => {
    Luminous.Settings.register(key, definition);
  });
}
