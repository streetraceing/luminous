import { getReact, useEffect, useMemo, useRef, useState } from '../react';
import { getUiHealth, subscribeUiHealth, UiHealthState } from '../../ui/health';

const NORMAL_MIN_MS = 900;
const NORMAL_MAX_MS = 1800;
const HELP_HINT_DELAY_MS = 8000;

export function SplashFeature() {
  const React = getReact();
  const effect = useEffect();
  const memo = useMemo();
  const ref = useRef();
  const state = useState();

  const mountedAt = ref(Date.now());
  const [visible, setVisible] = state(true);
  const [health, setHealth] = state<UiHealthState>(() => getUiHealth());
  const [now, setNow] = state(() => Date.now());

  effect(() => subscribeUiHealth(setHealth), []);

  effect(() => {
    if (health.status === 'waiting' || health.status === 'reloading') {
      setVisible(true);
      return;
    }

    const elapsed = Date.now() - mountedAt.current;
    const duration =
      health.status === 'ready'
        ? Math.max(0, NORMAL_MIN_MS - elapsed)
        : Math.max(0, NORMAL_MAX_MS - elapsed);

    const timeoutId = window.setTimeout(() => {
      setVisible(false);
    }, duration);

    return () => window.clearTimeout(timeoutId);
  }, [health.status]);

  effect(() => {
    if (health.status !== 'waiting' && health.status !== 'reloading') return;

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [health.status]);

  const message = memo(() => {
    if (health.status === 'waiting' && health.brokenSince) {
      return `Waiting for Spotify UI... (${formatSeconds(now - health.brokenSince)})`;
    }

    if (health.status === 'reloading') {
      return 'Spotify UI is stuck. Reloading...';
    }

    return 'Welcome back. Lighting up Spotify...';
  }, [health.brokenSince, health.status, now]);

  const showHelpHint =
    health.status === 'reloading' ||
    (health.status === 'waiting' &&
      health.brokenSince !== null &&
      now - health.brokenSince >= HELP_HINT_DELAY_MS);

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
            __html: Spicetify.SVGIcons.brightness,
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
          React.createElement(
            'span',
            null,
            'Still stuck? Spotify may have updated or Spicetify may be out of sync.',
          ),
          React.createElement(
            'span',
            null,
            'Try running ',
            React.createElement('code', null, 'spicetify restore'),
            ' in a terminal.',
          ),
        ),
    ),
  );
}

function formatSeconds(duration: number): string {
  return `${Math.max(0, Math.floor(duration / 1000))}s`;
}
