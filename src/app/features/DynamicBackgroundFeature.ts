import { useEffect, useMemo, useState } from '../react';
import { CanvasPayload } from '../../types/runtime/canvas.types';
import { SongPayload } from '../../types/runtime/song.types';
import { getUiHealth, subscribeUiHealth } from '../../ui/health';

export function DynamicBackgroundFeature() {
  const effect = useEffect();
  const memo = useMemo();
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
  const [appActive, setAppActive] = state(
    () => getUiHealth().status !== 'booting',
  );

  const renderKey = memo(() => {
    if (!appActive) return 'inactive';
    if (!enabled) return 'disabled';
    if (canvas.video) {
      return `canvas:${canvas.source ?? ''}:${canvas.revision}:${song?.image ?? ''}`;
    }
    if (song?.image) return `image:${song.image}`;
    return 'empty';
  }, [appActive, canvas, enabled, song?.image]);

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
      setSong(nextSong);
    };

    const handleCanvas = (payload: CanvasPayload) => {
      const nextKey = `${payload.mode ?? ''}\u0000${payload.source ?? ''}\u0000${payload.revision}`;
      if (canvasKey === nextKey && canvasVideo === payload.video) return;

      canvasKey = nextKey;
      canvasVideo = payload.video;
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

    return () => {
      Luminous.Song.removeEventListener('ready', handleSong);
      Luminous.Song.removeEventListener('change', handleSong);
      Luminous.Canvas.removeEventListener('mount', handleCanvas);
      Luminous.Canvas.removeEventListener('change', handleCanvas);
      Luminous.Canvas.removeEventListener('unmount', handleCanvas);
      unsubscribeHealth();
      unsubscribeSetting();
      unsubscribePaletteSetting();
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

    if (canvas.video) {
      Luminous.Background.render({
        canvas: canvas.video,
        canvasSource: canvas.source,
        image: song?.image,
      });
      return;
    }

    if (song?.image) {
      Luminous.Background.render({ image: song.image });
      return;
    }

    Luminous.Background.render();
  }, [renderKey]);

  return null;
}
