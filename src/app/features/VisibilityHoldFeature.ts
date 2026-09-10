import { useEffect } from '../react';

const HOLD_CLASS = 'luminous-visibility-hold';

/**
 * Freezes the ambient scene across window hide/show boundaries. When an
 * occluded or minimized window is revealed, Chromium first re-presents the
 * last committed frame; if the fresh frames resample the CSS animations at
 * wall-clock time inside that same moment, the scene visibly jumps once by
 * the whole hidden duration. Pausing on hide and releasing the hold two
 * rendered frames after the return lets the restored surface match the last
 * presented pose, then animation continues from where it stopped.
 */
export function VisibilityHoldFeature() {
  const effect = useEffect();

  effect(() => {
    const root = document.documentElement;
    let resumeFrame: number | null = null;

    const cancelResume = () => {
      if (resumeFrame === null) return;
      cancelAnimationFrame(resumeFrame);
      resumeFrame = null;
    };

    const scheduleResume = () => {
      cancelResume();
      resumeFrame = requestAnimationFrame(() => {
        resumeFrame = requestAnimationFrame(() => {
          resumeFrame = null;
          root.classList.remove(HOLD_CLASS);
        });
      });
    };

    const sync = () => {
      if (document.visibilityState === 'hidden') {
        cancelResume();
        root.classList.add(HOLD_CLASS);
        return;
      }

      scheduleResume();
    };

    document.addEventListener('visibilitychange', sync, { passive: true });
    sync();

    return () => {
      document.removeEventListener('visibilitychange', sync);
      cancelResume();
      root.classList.remove(HOLD_CLASS);
    };
  }, []);

  return null;
}
