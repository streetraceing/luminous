import { exposeGlobalAPI } from './api/global';
import { mountLuminousApp } from './app/runtime';

import.meta.glob('./styles/**/*.css', { eager: true });
exposeGlobalAPI();

Luminous.Logger.printBanner();

Luminous.Settings.init();
Luminous.Song.init();
Luminous.Canvas.init();

Luminous.Settings.register('backgroundBlur', {
  default: 24,
  apply: (value) => {
    Luminous.Settings.setVar('--luminous-background-blur', `${value}px`);
  },
});

Luminous.Settings.register('backgroundBrightness', {
  default: 75,
  apply: (value) => {
    Luminous.Settings.setVar(
      '--luminous-background-brightness',
      String(Number(value) / 100),
    );
  },
});

Luminous.Settings.register('uiOpacity', {
  default: 50,
  apply: (value) => {
    Luminous.Settings.setVar('--luminous-ui-opacity', `${value}%`);
  },
});

Luminous.Settings.register('dynamicBackground', {
  default: true,
  apply: (statement) => {
    Luminous.Settings.toggleClass('hideDynamicBackground', !statement);
    if (statement) {
      Luminous.Settings.setVar('--luminous-background', 'transparent');

      Luminous.Settings.setVar('--luminous-ui-base', 'var(--spice-sidebar)');
      Luminous.Settings.setVar(
        '--luminous-ui-opacity',
        `${Luminous.Settings.get('uiOpacity') ?? 50}%`,
      );
    } else {
      Luminous.Settings.removeVar('--luminous-background');

      Luminous.Settings.removeVar('--luminous-ui-base');
      Luminous.Settings.removeVar('--luminous-ui-opacity');
    }
  },
});

mountLuminousApp();
