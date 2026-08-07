import { useEffect } from '../react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const PARALLAX_EASING = 0.12;
const PARALLAX_EPSILON = 0.05;

export function MotionFeature() {
  const effect = useEffect();

  effect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    let frameId: number | null = null;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    let reduceMotion = Luminous.Settings.get<boolean>('reduceMotion') === true;
    let respectSystem =
      Luminous.Settings.get<boolean>('respectSystemMotion') !== false;
    let parallax = Luminous.Settings.get<boolean>('parallax') !== false;
    let parallaxStrength = Number(
      Luminous.Settings.get<number>('parallaxStrength') ?? 8,
    );
    let pauseWhenHidden =
      Luminous.Settings.get<boolean>('pauseWhenHidden') !== false;

    const isReduced = () =>
      reduceMotion || (respectSystem && mediaQuery.matches);

    const resetParallax = () => {
      targetX = 0;
      targetY = 0;
      if (frameId === null) frameId = requestAnimationFrame(animateParallax);
    };

    const syncMotionState = () => {
      const reduced = isReduced();
      root.classList.toggle('luminous-reduce-motion', reduced);
      if (reduced || !parallax) resetParallax();
    };

    const syncVisibility = () => {
      const suspended = pauseWhenHidden && document.hidden;
      root.classList.toggle('luminous-runtime-suspended', suspended);
    };

    const animateParallax = () => {
      frameId = null;
      currentX += (targetX - currentX) * PARALLAX_EASING;
      currentY += (targetY - currentY) * PARALLAX_EASING;

      if (Math.abs(currentX) < PARALLAX_EPSILON) currentX = 0;
      if (Math.abs(currentY) < PARALLAX_EPSILON) currentY = 0;

      root.style.setProperty(
        '--luminous-parallax-x',
        `${(currentX * parallaxStrength).toFixed(2)}px`,
      );
      root.style.setProperty(
        '--luminous-parallax-y',
        `${(currentY * parallaxStrength).toFixed(2)}px`,
      );

      if (
        Math.abs(targetX - currentX) > PARALLAX_EPSILON ||
        Math.abs(targetY - currentY) > PARALLAX_EPSILON
      ) {
        frameId = requestAnimationFrame(animateParallax);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (
        !parallax ||
        isReduced() ||
        root.classList.contains('luminous-settings-open') ||
        (pauseWhenHidden && document.hidden)
      ) {
        return;
      }

      targetX = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      targetY = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;

      if (frameId === null) frameId = requestAnimationFrame(animateParallax);
    };

    const unsubscribers = [
      Luminous.Settings.subscribe<boolean>(
        'reduceMotion',
        (value) => {
          reduceMotion = value === true;
          syncMotionState();
        },
        { immediate: true },
      ),
      Luminous.Settings.subscribe<boolean>(
        'respectSystemMotion',
        (value) => {
          respectSystem = value !== false;
          syncMotionState();
        },
        { immediate: true },
      ),
      Luminous.Settings.subscribe<boolean>(
        'parallax',
        (value) => {
          parallax = value !== false;
          syncMotionState();
        },
        { immediate: true },
      ),
      Luminous.Settings.subscribe<number>(
        'parallaxStrength',
        (value) => {
          parallaxStrength = Number(value);
          if (frameId === null)
            frameId = requestAnimationFrame(animateParallax);
        },
        { immediate: true },
      ),
      Luminous.Settings.subscribe<boolean>(
        'pauseWhenHidden',
        (value) => {
          pauseWhenHidden = value !== false;
          syncVisibility();
        },
        { immediate: true },
      ),
    ];

    mediaQuery.addEventListener('change', syncMotionState);
    window.addEventListener('pointermove', handlePointerMove, {
      passive: true,
    });
    window.addEventListener('pointerleave', resetParallax);
    document.addEventListener('visibilitychange', syncVisibility);
    syncMotionState();
    syncVisibility();

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      mediaQuery.removeEventListener('change', syncMotionState);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', resetParallax);
      document.removeEventListener('visibilitychange', syncVisibility);
      if (frameId !== null) cancelAnimationFrame(frameId);
      root.classList.remove('luminous-runtime-suspended');
      root.style.removeProperty('--luminous-parallax-x');
      root.style.removeProperty('--luminous-parallax-y');
    };
  }, []);

  return null;
}
