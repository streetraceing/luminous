import type {
  SettingDefinition,
  SettingValue,
} from '../types/runtime/settings.types';

export const motionModes = ['still', 'drift', 'float'] as const;
export type MotionMode = (typeof motionModes)[number];

export const backgroundSources = ['auto', 'artwork'] as const;
export type BackgroundSource = (typeof backgroundSources)[number];

export type LuminousSettingValues = {
  dynamicBackground: boolean;
  backgroundSource: BackgroundSource;
  dynamicPalette: boolean;
  backgroundBlur: number;
  backgroundBrightness: number;
  uiOpacity: number;
  uiBlur: number;
  paletteStrength: number;
  backgroundMotion: MotionMode;
  motionDuration: number;
  reduceMotion: boolean;
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
  reduceMotion: {
    default: false,
    normalize: booleanNormalizer(false),
    apply: (value) =>
      Luminous.Settings.toggleClass('luminous-reduce-motion', value),
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
    key: 'backgroundMotion',
    label: 'Background movement',
    description: 'Choose the stable media/light motion path.',
    section: 'motion',
    control: 'choice',
    options: [
      { value: 'still', label: 'Still' },
      { value: 'drift', label: 'Drift' },
      { value: 'float', label: 'Float' },
    ],
  },
  {
    key: 'motionDuration',
    label: 'Motion speed',
    description: 'Scales media movement and adaptive scene tempo.',
    section: 'motion',
    control: 'range',
    min: 8,
    max: 60,
    step: 1,
    unit: 's',
  },
  {
    key: 'reduceMotion',
    label: 'Reduce motion',
    description: 'Stops Luminous animation regardless of system preference.',
    section: 'motion',
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
    description: 'Stable default balance of clarity, colour, and motion.',
    values: {
      dynamicBackground: true,
      backgroundSource: 'auto',
      dynamicPalette: true,
      backgroundBlur: 24,
      backgroundBrightness: 75,
      uiOpacity: 50,
      uiBlur: 16,
      paletteStrength: 24,
      backgroundMotion: 'drift',
      motionDuration: 20,
    },
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    description:
      'Brighter media and stronger colour without extra compositor layers.',
    values: {
      dynamicBackground: true,
      backgroundSource: 'auto',
      dynamicPalette: true,
      backgroundBlur: 16,
      backgroundBrightness: 88,
      uiOpacity: 38,
      uiBlur: 20,
      paletteStrength: 36,
      backgroundMotion: 'float',
      motionDuration: 26,
    },
  },
  {
    id: 'calm',
    label: 'Calm',
    description: 'Artwork-only mode with soft lighting and no movement.',
    values: {
      dynamicBackground: true,
      backgroundSource: 'artwork',
      dynamicPalette: true,
      backgroundBlur: 36,
      backgroundBrightness: 62,
      uiOpacity: 68,
      uiBlur: 18,
      paletteStrength: 14,
      backgroundMotion: 'still',
    },
  },
  {
    id: 'performance',
    label: 'Performance',
    description: 'Artwork-only mode with minimal motion and lower glass cost.',
    values: {
      dynamicBackground: true,
      backgroundSource: 'artwork',
      dynamicPalette: true,
      backgroundBlur: 18,
      backgroundBrightness: 72,
      uiOpacity: 72,
      uiBlur: 10,
      paletteStrength: 10,
      backgroundMotion: 'still',
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
