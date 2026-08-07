import { useEffect } from '../react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Accessibility-only motion coordinator.
 *
 * The pointer parallax / visibility compositor loop introduced in 2.2.0 was
 * intentionally removed. This feature now only mirrors the explicit setting
 * and the OS reduced-motion preference into the stable CSS class that existed
 * before the visual refactor.
 */
export function MotionFeature() {
  const effect = useEffect();

  effect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    let reduceMotion = Luminous.Settings.get<boolean>('reduceMotion') === true;
    let respectSystem =
      Luminous.Settings.get<boolean>('respectSystemMotion') !== false;

    const sync = () => {
      root.classList.toggle(
        'luminous-reduce-motion',
        reduceMotion || (respectSystem && mediaQuery.matches),
      );
    };

    const unsubscribeReduce = Luminous.Settings.subscribe<boolean>(
      'reduceMotion',
      (value) => {
        reduceMotion = value === true;
        sync();
      },
      { immediate: true },
    );
    const unsubscribeSystem = Luminous.Settings.subscribe<boolean>(
      'respectSystemMotion',
      (value) => {
        respectSystem = value !== false;
        sync();
      },
      { immediate: true },
    );

    mediaQuery.addEventListener('change', sync);
    sync();

    return () => {
      unsubscribeReduce();
      unsubscribeSystem();
      mediaQuery.removeEventListener('change', sync);
      root.classList.remove('luminous-reduce-motion');
    };
  }, []);

  return null;
}
