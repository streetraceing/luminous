import { useEffect } from '../react';

const HIDDEN_CLASS = 'luminous-document-hidden';

/**
 * Stops only decorative CSS animation work when Chromium marks the document
 * hidden. Media playback is deliberately left untouched to avoid black-frame
 * resume bugs in Spotify/Electron.
 */
export function PerformanceFeature() {
  const effect = useEffect();

  effect(() => {
    const root = document.documentElement;

    const sync = () => {
      root.classList.toggle(
        HIDDEN_CLASS,
        document.visibilityState === 'hidden',
      );
    };

    document.addEventListener('visibilitychange', sync, { passive: true });
    sync();

    return () => {
      document.removeEventListener('visibilitychange', sync);
      root.classList.remove(HIDDEN_CLASS);
    };
  }, []);

  return null;
}
