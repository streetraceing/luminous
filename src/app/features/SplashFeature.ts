import { getReact, useEffect, useMemo, useRef, useState } from '../react';
import { getUiHealth, subscribeUiHealth, UiHealthState } from '../../ui/health';

const MIN_VISIBLE_MS = 600;
const MAX_VISIBLE_MS = 2600;
const HELP_HINT_DELAY_MS = 1500;
const SPOTIFY_SHELL_SELECTOR = '.Root__top-container #main-view';
const SCRIPT_STARTED_AT = Date.now();

export function SplashFeature() {
  const React = getReact();
  const effect = useEffect();
  const memo = useMemo();
  const ref = useRef();
  const state = useState();

  const [shellPresent, setShellPresent] = state(() => hasSpotifyShell());
  const [visible, setVisible] = state(true);
  const [health, setHealth] = state<UiHealthState>(() => getUiHealth());
  const [now, setNow] = state(() => Date.now());
  const mountedAt = ref<number | null>(shellPresent ? SCRIPT_STARTED_AT : null);
  const finished = ref(false);

  effect(() => subscribeUiHealth(setHealth), []);

  effect(() => {
    let frameId: number | null = null;

    const syncShellPresence = () => {
      frameId = null;
      setShellPresent(hasSpotifyShell());
    };

    const scheduleSync = () => {
      if (frameId !== null) return;
      frameId = requestAnimationFrame(syncShellPresence);
    };

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    syncShellPresence();

    return () => {
      observer.disconnect();
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, []);

  effect(() => {
    if (!shellPresent || finished.current) return;

    if (mountedAt.current === null) {
      mountedAt.current = Date.now();
    }

    const elapsed = Date.now() - mountedAt.current;
    const targetDuration =
      health.status === 'ready' ? MIN_VISIBLE_MS : MAX_VISIBLE_MS;
    const remaining = Math.max(0, targetDuration - elapsed);

    const timeoutId = window.setTimeout(() => {
      finished.current = true;
      setVisible(false);
    }, remaining);

    return () => window.clearTimeout(timeoutId);
  }, [health.status, shellPresent]);

  effect(() => {
    if (!shellPresent || !visible || health.status !== 'waiting') return;

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [health.status, shellPresent, visible]);

  const message = memo(() => {
    if (health.status === 'waiting' && health.brokenSince) {
      return `Waiting for Spotify UI... (${formatSeconds(now - health.brokenSince)})`;
    }

    if (health.status === 'ready') {
      return 'Welcome back. Lighting up Spotify...';
    }

    return 'Starting Luminous...';
  }, [health.brokenSince, health.status, now]);

  const showHelpHint =
    health.status === 'waiting' &&
    health.brokenSince !== null &&
    now - health.brokenSince >= HELP_HINT_DELAY_MS;

  if (!shellPresent) return null;

  return React.createElement(
    'div',
    {
      className: `luminous-splash${visible ? '' : ' luminous-splash--hidden'}`,
      'aria-hidden': visible ? 'false' : 'true',
    },
    React.createElement(
      'div',
      { className: 'luminous-splash__panel' },
      React.createElement(
        'div',
        { className: 'luminous-splash__mark' },
        React.createElement('svg', {
          className: 'luminous-splash__luminous-icon',
          viewBox: '0 0 16 16',
          'aria-hidden': 'true',
          focusable: 'false',
          dangerouslySetInnerHTML: {
            __html: Spicetify.SVGIcons?.brightness ?? '',
          },
        }),
      ),
      React.createElement(
        'div',
        { className: 'luminous-splash__copy' },
        React.createElement('span', null, 'Luminous'),
        React.createElement('small', null, message),
      ),
      React.createElement(
        'div',
        { className: 'luminous-splash__loader' },
        React.createElement('span'),
      ),
      showHelpHint &&
        React.createElement(
          'div',
          { className: 'luminous-splash__hint' },
          'Spotify is taking longer than expected. The splash will close automatically.',
        ),
    ),
  );
}

function hasSpotifyShell(): boolean {
  return document.querySelector(SPOTIFY_SHELL_SELECTOR) !== null;
}

function formatSeconds(duration: number): string {
  return `${Math.max(0, Math.floor(duration / 1000))}s`;
}
