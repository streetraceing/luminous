import { useEffect } from '../react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// Mirrors the explicit `reduceMotion` setting and the OS reduced-motion
// preference into the stable CSS class consumed by luminous.css.
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
