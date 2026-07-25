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

Luminous.Settings.init();

void Luminous.Song.init().catch((error) => {
  Luminous.Logger.error('Song', 'Initialization failed', error);
});

Luminous.Canvas.init();
mountLuminousApp();
