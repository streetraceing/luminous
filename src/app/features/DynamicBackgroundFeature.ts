import { useEffect, useMemo, useState } from "../react";
import { CanvasPayload } from "../../types/runtime/canvas.types";
import { SongPayload } from "../../types/runtime/song.types";

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
    () => Luminous.Settings.get("dynamicBackground") !== false,
  );

  const renderKey = memo(() => {
    if (!enabled) return "disabled";
    if (canvas) return `canvas:${canvas.currentSrc}`;
    if (song?.image) return `image:${song.image}`;
    return "empty";
  }, [canvas, enabled, song?.image]);

  effect(() => {
    const handleSong = (nextSong: SongPayload) => {
      setSong(nextSong);
      Luminous.Background.preloadImage(nextSong.image);
    };

    const handleCanvas = (payload: CanvasPayload) => {
      setCanvas(payload.video);
    };

    const handleCanvasUnmount = () => {
      setCanvas(null);
    };

    Luminous.Song.addEventListener("ready", handleSong);
    Luminous.Song.addEventListener("change", handleSong);
    Luminous.Canvas.addEventListener("mount", handleCanvas);
    Luminous.Canvas.addEventListener("change", handleCanvas);
    Luminous.Canvas.addEventListener("unmount", handleCanvasUnmount);

    const unsubscribeSetting = Luminous.Settings.subscribe<boolean>(
      "dynamicBackground",
      (value) => setEnabled(value !== false),
      { immediate: true },
    );

    const currentSong = Luminous.Song.getSync();
    if (currentSong) {
      handleSong(currentSong);
    }

    return () => {
      Luminous.Song.removeEventListener("ready", handleSong);
      Luminous.Song.removeEventListener("change", handleSong);
      Luminous.Canvas.removeEventListener("mount", handleCanvas);
      Luminous.Canvas.removeEventListener("change", handleCanvas);
      Luminous.Canvas.removeEventListener("unmount", handleCanvasUnmount);
      unsubscribeSetting();
    };
  }, []);

  effect(() => {
    if (!enabled) return;

    if (canvas) {
      Luminous.Background.render({ canvas });
      return;
    }

    if (song?.image) {
      Luminous.Background.render({ image: song.image });
      return;
    }

    Luminous.Background.render();
  }, [canvas, enabled, renderKey, song?.image]);

  return null;
}
