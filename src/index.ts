import { exposeGlobalAPI } from './api/global';
import { mountLuminousApp } from './app/runtime';

import.meta.glob('./styles/**/*.css', { eager: true });
exposeGlobalAPI();

Luminous.Logger.printBanner();

const normalizeNumber = (fallback: number, min: number, max: number) => {
  return (value: unknown) => {
    if (typeof value !== 'number' && typeof value !== 'string') {
      return fallback;
    }

    if (typeof value === 'string' && value.trim() === '') {
      return fallback;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) return fallback;

    return Math.min(max, Math.max(min, parsed));
  };
};

const backgroundEnergyProfiles = ['calm', 'ambient', 'bass'] as const;
type BackgroundEnergyProfile = (typeof backgroundEnergyProfiles)[number];

const normalizeBackgroundEnergyProfile = (
  value: unknown,
): BackgroundEnergyProfile => {
  return typeof value === 'string' &&
    backgroundEnergyProfiles.includes(value as BackgroundEnergyProfile)
    ? (value as BackgroundEnergyProfile)
    : 'ambient';
};

const energyProfileFactors: Record<
  BackgroundEnergyProfile,
  { blobDurations: [number, number, number, number] }
> = {
  calm: { blobDurations: [28, 34, 40, 46] },
  ambient: { blobDurations: [18, 24, 30, 36] },
  bass: { blobDurations: [9, 13, 17, 21] },
};

const applyBackgroundEnergy = (
  profile: BackgroundEnergyProfile,
  strength: number,
) => {
  const energy = energyProfileFactors[profile];
  const auraOpacity = Math.min(86, Math.round(strength * 1.85));

  backgroundEnergyProfiles.forEach((name) => {
    Luminous.Settings.toggleClass(`luminous-energy-${name}`, name === profile);
  });
  Luminous.Settings.setVar(
    '--luminous-palette-effect-opacity',
    `${auraOpacity}%`,
  );
  energy.blobDurations.forEach((duration, index) => {
    Luminous.Settings.setVar(
      `--luminous-blob-${index + 1}-duration`,
      `${duration}s`,
    );
  });
};

Luminous.Settings.register('backgroundBlur', {
  default: 24,
  normalize: normalizeNumber(24, 0, 48),
  apply: (value) => {
    Luminous.Settings.setVar('--luminous-background-blur', `${value}px`);
  },
});

Luminous.Settings.register('backgroundBrightness', {
  default: 75,
  normalize: normalizeNumber(75, 30, 120),
  apply: (value) => {
    Luminous.Settings.setVar(
      '--luminous-background-brightness',
      String(Number(value) / 100),
    );
  },
});

Luminous.Settings.register('uiBlur', {
  default: 16,
  normalize: normalizeNumber(16, 0, 32),
  apply: (value) => {
    Luminous.Settings.setVar('--luminous-ui-blur', `${value}px`);
  },
});

Luminous.Settings.register('paletteStrength', {
  default: 24,
  normalize: normalizeNumber(24, 0, 45),
  apply: (value) => {
    applyBackgroundEnergy(
      normalizeBackgroundEnergyProfile(
        Luminous.Settings.get('backgroundEnergy'),
      ),
      Number(value),
    );
  },
});

Luminous.Settings.register('backgroundEnergy', {
  default: 'ambient',
  normalize: normalizeBackgroundEnergyProfile,
  apply: (value) => {
    applyBackgroundEnergy(
      normalizeBackgroundEnergyProfile(value),
      Number(Luminous.Settings.get('paletteStrength') ?? 24),
    );
  },
});

Luminous.Settings.register('uiOpacity', {
  default: 50,
  normalize: normalizeNumber(50, 0, 100),
  apply: (value) => {
    if (Luminous.Settings.get<boolean>('dynamicBackground') === false) {
      Luminous.Settings.removeVar('--luminous-ui-opacity');
      return;
    }

    Luminous.Settings.setVar('--luminous-ui-opacity', `${value}%`);
  },
});

Luminous.Settings.register('dynamicBackground', {
  default: true,
  normalize: (value) => (typeof value === 'boolean' ? value : true),
  apply: (value) => {
    const enabled = value === true;

    Luminous.Settings.toggleClass('hideDynamicBackground', !enabled);
    if (enabled) {
      Luminous.Settings.setVar('--luminous-background', 'transparent');
      Luminous.Settings.setVar('--luminous-ui-base', 'var(--spice-sidebar)');
      Luminous.Settings.setVar(
        '--luminous-ui-opacity',
        `${Luminous.Settings.get('uiOpacity') ?? 50}%`,
      );
      return;
    }

    Luminous.Settings.removeVar('--luminous-background');
    Luminous.Settings.removeVar('--luminous-ui-base');
    Luminous.Settings.removeVar('--luminous-ui-opacity');
  },
});

Luminous.Settings.register('dynamicPalette', {
  default: true,
  normalize: (value) => (typeof value === 'boolean' ? value : true),
  apply: (value) => {
    if (value === false) {
      Luminous.Palette.clear();
    }
  },
});

const motionModes = ['still', 'drift', 'float'] as const;
type MotionMode = (typeof motionModes)[number];

const normalizeMotionMode = (value: unknown): MotionMode => {
  return typeof value === 'string' && motionModes.includes(value as MotionMode)
    ? (value as MotionMode)
    : 'drift';
};

Luminous.Settings.register('backgroundMotion', {
  default: 'drift',
  normalize: normalizeMotionMode,
  apply: (value) => {
    motionModes.forEach((mode) => {
      Luminous.Settings.toggleClass(`luminous-motion-${mode}`, mode === value);
    });
  },
});

Luminous.Settings.register('motionDuration', {
  default: 20,
  normalize: normalizeNumber(20, 8, 48),
  apply: (value) => {
    Luminous.Settings.setVar('--luminous-motion-duration', `${value}s`);
  },
});

Luminous.Settings.register('reduceMotion', {
  default: false,
  normalize: (value) => (typeof value === 'boolean' ? value : false),
  apply: (value) => {
    Luminous.Settings.toggleClass('luminous-reduce-motion', value === true);
  },
});

Luminous.Settings.init();

void Luminous.Song.init().catch((error) => {
  Luminous.Logger.error('Song', 'Initialization failed', error);
});

Luminous.Canvas.init();
mountLuminousApp();
