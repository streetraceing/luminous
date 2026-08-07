import { Background } from '../render/background';
import { Canvas } from './canvas';
import { Diagnostics } from './diagnostics';
import { Logger } from './logger';
import { Native } from './native';
import { Palette } from './palette';
import { Settings } from './settings';
import { Song } from './song';

type ExistingLuminousRuntime = {
  destroy?: () => void;
};

export function destroyExistingRuntime(): void {
  const existing = (window as Window & { Luminous?: ExistingLuminousRuntime })
    .Luminous;

  if (typeof existing?.destroy !== 'function') return;

  try {
    existing.destroy();
  } catch (error) {
    console.warn('[Luminous] Failed to clean previous runtime', error);
  }
}

export function exposeGlobalAPI(destroy: () => void): void {
  Object.defineProperty(window, 'Luminous', {
    value: {
      Background,
      Canvas,
      Diagnostics,
      Song,
      Native,
      Palette,
      Settings,
      Logger,
      destroy,
      version: __APP_VERSION__,
    },
    configurable: true,
  });
}
