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
  const [canvas, setCanvas] = state<HTMLVideoElement | null>(() =>
    Luminous.Canvas.getVideo(),
  );
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
    if (canvas) {
      return `canvas:${canvas.currentSrc}:${song?.image ?? ''}`;
    }
    if (song?.image) return `image:${song.image}`;
    return 'empty';
  }, [appActive, canvas, enabled, song?.image]);

  effect(() => {
    const handleSong = (nextSong: SongPayload) => {
      Luminous.Palette.cancel();
      setSong(nextSong);
      Luminous.Background.preloadImage(nextSong.image);
    };

    const handleCanvas = (payload: CanvasPayload) => {
      setCanvas(payload.video);
    };

    const handleCanvasUnmount = () => {
      setCanvas(null);
    };

    Luminous.Song.addEventListener('ready', handleSong);
    Luminous.Song.addEventListener('change', handleSong);
    Luminous.Canvas.addEventListener('mount', handleCanvas);
    Luminous.Canvas.addEventListener('change', handleCanvas);
    Luminous.Canvas.addEventListener('unmount', handleCanvasUnmount);

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

    const currentSong = Luminous.Song.getSync();
    if (currentSong) {
      handleSong(currentSong);
    }

    return () => {
      Luminous.Song.removeEventListener('ready', handleSong);
      Luminous.Song.removeEventListener('change', handleSong);
      Luminous.Canvas.removeEventListener('mount', handleCanvas);
      Luminous.Canvas.removeEventListener('change', handleCanvas);
      Luminous.Canvas.removeEventListener('unmount', handleCanvasUnmount);
      unsubscribeHealth();
      unsubscribeSetting();
      unsubscribePaletteSetting();
      Luminous.Background.destroy();
      Luminous.Palette.clear();
    };
  }, []);

  effect(() => {
    if (!appActive || !dynamicPalette) {
      Luminous.Palette.clear();
      return;
    }

    void Luminous.Palette.applyFromImage(song?.image);
  }, [appActive, dynamicPalette, song?.image]);

  effect(() => {
    if (!appActive) {
      Luminous.Background.destroy();
      return;
    }

    if (!enabled) {
      Luminous.Background.clear();
      return;
    }

    if (canvas) {
      Luminous.Background.render({ canvas, image: song?.image });
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
