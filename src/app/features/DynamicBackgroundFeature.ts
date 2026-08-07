import { useEffect, useMemo, useRef, useState } from '../react';
import { CanvasPayload } from '../../types/runtime/canvas.types';
import { SongPayload } from '../../types/runtime/song.types';
import { getUiHealth, subscribeUiHealth } from '../../ui/health';

const CANVAS_HANDOFF_GRACE_MS = 320;

export function DynamicBackgroundFeature() {
  const effect = useEffect();
  const memo = useMemo();
  const ref = useRef();
  const state = useState();

  const [song, setSong] = state<SongPayload | null>(() =>
    Luminous.Song.getSync(),
  );
  const [canvas, setCanvas] = state<CanvasPayload>(() => Luminous.Canvas.get());
  const [enabled, setEnabled] = state(
    () => Luminous.Settings.get('dynamicBackground') !== false,
  );
  const [dynamicPalette, setDynamicPalette] = state(
    () => Luminous.Settings.get('dynamicPalette') !== false,
  );
  const [backgroundSource, setBackgroundSource] = state(() =>
    String(Luminous.Settings.get('backgroundSource') ?? 'auto'),
  );
  const [appActive, setAppActive] = state(
    () => getUiHealth().status !== 'booting',
  );
  const handoffDeadline = ref(0);
  const handoffTimer = ref<number | null>(null);
  const [handoffRevision, setHandoffRevision] = state(0);

  const clearHandoffTimer = () => {
    if (handoffTimer.current === null) return;
    window.clearTimeout(handoffTimer.current);
    handoffTimer.current = null;
  };

  const scheduleHandoffExpiry = () => {
    clearHandoffTimer();

    const remaining = handoffDeadline.current - performance.now();
    if (remaining <= 0) {
      handoffDeadline.current = 0;
      setHandoffRevision((value) => value + 1);
      return;
    }

    handoffTimer.current = window.setTimeout(() => {
      handoffTimer.current = null;
      handoffDeadline.current = 0;
      setHandoffRevision((value) => value + 1);
    }, remaining);
  };

  const renderKey = memo(() => {
    if (!appActive) return 'inactive';
    if (!enabled) return 'disabled';
    if (backgroundSource === 'auto' && canvas.video) {
      return `canvas:${canvas.source ?? ''}:${canvas.revision}:${song?.image ?? ''}`;
    }
    if (song?.image) return `image:${song.image}`;
    return 'empty';
  }, [appActive, backgroundSource, canvas, enabled, song?.image]);

  effect(() => {
    let songKey = song ? `${song.uri}\u0000${song.image ?? ''}` : null;
    let canvasKey = `${canvas.mode ?? ''}\u0000${canvas.source ?? ''}\u0000${canvas.revision}`;
    let canvasVideo = canvas.video;

    const handleSong = (nextSong: SongPayload) => {
      const nextKey = `${nextSong.uri}\u0000${nextSong.image ?? ''}`;
      if (songKey === nextKey) return;

      songKey = nextKey;
      Luminous.Palette.cancel();
      Luminous.Background.preloadImage(nextSong.image);

      if (Luminous.Background.getType() === 'canvas') {
        handoffDeadline.current = performance.now() + CANVAS_HANDOFF_GRACE_MS;
        scheduleHandoffExpiry();
      }

      setSong(nextSong);
    };

    const handleCanvas = (payload: CanvasPayload) => {
      const nextKey = `${payload.mode ?? ''}\u0000${payload.source ?? ''}\u0000${payload.revision}`;
      if (canvasKey === nextKey && canvasVideo === payload.video) return;

      canvasKey = nextKey;
      canvasVideo = payload.video;

      if (payload.video) {
        handoffDeadline.current = 0;
        clearHandoffTimer();
      }

      setCanvas(payload);
    };

    Luminous.Song.addEventListener('ready', handleSong);
    Luminous.Song.addEventListener('change', handleSong);
    Luminous.Canvas.addEventListener('mount', handleCanvas);
    Luminous.Canvas.addEventListener('change', handleCanvas);
    Luminous.Canvas.addEventListener('unmount', handleCanvas);

    const unsubscribeHealth = subscribeUiHealth((health) => {
      setAppActive(health.status !== 'booting');
    });

    const unsubscribeSetting = Luminous.Settings.subscribe<boolean>(
      'dynamicBackground',
      (value) => setEnabled(value !== false),
      { immediate: true },
    );
    const unsubscribePaletteSetting = Luminous.Settings.subscribe<boolean>(
      'dynamicPalette',
      (value) => setDynamicPalette(value !== false),
      { immediate: true },
    );
    const unsubscribeSourceSetting = Luminous.Settings.subscribe<string>(
      'backgroundSource',
      (value) => setBackgroundSource(String(value)),
      { immediate: true },
    );

    return () => {
      Luminous.Song.removeEventListener('ready', handleSong);
      Luminous.Song.removeEventListener('change', handleSong);
      Luminous.Canvas.removeEventListener('mount', handleCanvas);
      Luminous.Canvas.removeEventListener('change', handleCanvas);
      Luminous.Canvas.removeEventListener('unmount', handleCanvas);
      unsubscribeHealth();
      unsubscribeSetting();
      unsubscribePaletteSetting();
      unsubscribeSourceSetting();
      clearHandoffTimer();
      handoffDeadline.current = 0;
      Luminous.Background.destroy();
      Luminous.Palette.clear();
    };
  }, []);

  effect(() => {
    if (!appActive || !enabled || !dynamicPalette) {
      Luminous.Palette.clear();
      return;
    }

    void Luminous.Palette.applyFromImage(song?.image);
  }, [appActive, dynamicPalette, enabled, song?.image]);

  effect(() => {
    if (!appActive) {
      Luminous.Background.destroy();
      return;
    }

    if (!enabled) {
      Luminous.Background.clear();
      return;
    }

    if (backgroundSource === 'auto' && canvas.video) {
      handoffDeadline.current = 0;
      clearHandoffTimer();
      Luminous.Background.render({
        canvas: canvas.video,
        canvasSource: canvas.source,
        image: song?.image,
      });
      return;
    }

    if (
      backgroundSource === 'auto' &&
      Luminous.Background.getType() === 'canvas' &&
      handoffDeadline.current > performance.now()
    ) {
      scheduleHandoffExpiry();
      return;
    }

    if (song?.image) {
      Luminous.Background.render({ image: song.image });
      return;
    }

    Luminous.Background.render();
  }, [handoffRevision, renderKey]);

  return null;
}
