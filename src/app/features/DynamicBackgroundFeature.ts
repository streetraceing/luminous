import { useEffect, useMemo, useRef, useState } from '../react';
import type { BackgroundPayload } from '../../render/background';
import { CanvasPayload } from '../../types/runtime/canvas.types';
import { SongPayload } from '../../types/runtime/song.types';
import { getUiHealth, subscribeUiHealth } from '../../ui/health';

const CANVAS_HANDOFF_GRACE_MS = 420;
const TRACK_TRANSITION_FAILSAFE_MS = 2400;
const PALETTE_AFTER_MEDIA_DELAY_MS = 140;

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
  const trackTransitionTimer = ref<number | null>(null);
  const paletteCommitTimer = ref<number | null>(null);
  const latestCanvasRevision = ref(canvas.revision);
  const canvasRevisionFloor = ref(-1);
  const latestSongImage = ref<string | null>(song?.image ?? null);
  const backgroundEnabled = ref(enabled);
  const paletteEnabled = ref(dynamicPalette);
  const appActiveRef = ref(appActive);
  const [handoffRevision, setHandoffRevision] = state(0);

  const clearHandoffTimer = () => {
    if (handoffTimer.current === null) return;
    window.clearTimeout(handoffTimer.current);
    handoffTimer.current = null;
  };

  const clearTrackTransition = () => {
    if (trackTransitionTimer.current !== null) {
      window.clearTimeout(trackTransitionTimer.current);
      trackTransitionTimer.current = null;
    }

    document.documentElement.classList.remove('luminous-track-changing');
  };

  const clearPaletteCommitTimer = () => {
    if (paletteCommitTimer.current === null) return;

    window.clearTimeout(paletteCommitTimer.current);
    paletteCommitTimer.current = null;
  };

  const markTrackTransition = () => {
    clearTrackTransition();
    document.documentElement.classList.add('luminous-track-changing');
    trackTransitionTimer.current = window.setTimeout(
      clearTrackTransition,
      TRACK_TRANSITION_FAILSAFE_MS,
    );
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

    const songKey = `${song?.uri ?? ''}:${song?.image ?? ''}`;
    if (backgroundSource === 'auto' && canvas.video) {
      return `canvas:${canvas.source ?? ''}:${canvas.revision}:${songKey}`;
    }
    if (song?.image) return `image:${songKey}`;
    return `empty:${song?.uri ?? ''}`;
  }, [appActive, backgroundSource, canvas, enabled, song?.image, song?.uri]);

  effect(() => {
    let songKey = song ? `${song.uri}\u0000${song.image ?? ''}` : null;
    let canvasKey = `${canvas.mode ?? ''}\u0000${canvas.source ?? ''}\u0000${canvas.revision}`;
    let canvasVideo = canvas.video;

    const handleSong = (nextSong: SongPayload) => {
      const nextKey = `${nextSong.uri}\u0000${nextSong.image ?? ''}`;
      if (songKey === nextKey) return;

      const isInitialSong = songKey === null;
      const previousImage = latestSongImage.current;
      songKey = nextKey;
      latestSongImage.current = nextSong.image;
      Luminous.Background.preloadImage(nextSong.image);
      void Luminous.Palette.warmFromImage(nextSong.image);

      if (!isInitialSong) {
        clearPaletteCommitTimer();
        const visualChangeExpected =
          Luminous.Background.getType() === 'canvas' ||
          previousImage !== nextSong.image;

        if (visualChangeExpected) markTrackTransition();
        if (Luminous.Background.getType() === 'canvas') {
          Luminous.Background.holdCurrentFrame();
        }

        // A Canvas object can survive a Spotify songchange event for a short
        // time even though it still represents the previous song. Requiring a
        // newer Canvas revision prevents that stale object from immediately
        // cancelling the handoff grace period and causing Canvas/artwork
        // ping-pong while Spotify replaces the media source.
        canvasRevisionFloor.current = latestCanvasRevision.current;

        if (Luminous.Background.getType() === 'canvas') {
          handoffDeadline.current = performance.now() + CANVAS_HANDOFF_GRACE_MS;
          scheduleHandoffExpiry();
        } else {
          handoffDeadline.current = 0;
          clearHandoffTimer();
        }
      }

      setSong(nextSong);
    };

    const handleCanvas = (payload: CanvasPayload) => {
      const nextKey = `${payload.mode ?? ''}\u0000${payload.source ?? ''}\u0000${payload.revision}`;
      if (canvasKey === nextKey && canvasVideo === payload.video) return;

      canvasKey = nextKey;
      canvasVideo = payload.video;
      latestCanvasRevision.current = Math.max(
        latestCanvasRevision.current,
        payload.revision,
      );

      if (payload.video && payload.revision > canvasRevisionFloor.current) {
        handoffDeadline.current = 0;
        clearHandoffTimer();
      }

      setCanvas(payload);
    };

    const handleBackground = (payload: BackgroundPayload) => {
      if (payload.phase !== 'settled') return;

      clearPaletteCommitTimer();

      const commitPalette = async () => {
        paletteCommitTimer.current = null;

        if (
          backgroundEnabled.current &&
          paletteEnabled.current &&
          appActiveRef.current
        ) {
          await Luminous.Palette.applyFromImage(latestSongImage.current);
        }

        clearTrackTransition();
      };

      // Do not rebuild the large mix-blend/blur effect scene in the exact frame
      // where the media compositor finishes a track handoff. Let the new media
      // become fully stable first, then commit the already-warmed palette on a
      // separate frame budget.
      if (
        document.documentElement.classList.contains('luminous-track-changing')
      ) {
        paletteCommitTimer.current = window.setTimeout(
          () => void commitPalette(),
          PALETTE_AFTER_MEDIA_DELAY_MS,
        );
      } else {
        void commitPalette();
      }
    };

    Luminous.Song.addEventListener('ready', handleSong);
    Luminous.Song.addEventListener('change', handleSong);
    Luminous.Canvas.addEventListener('mount', handleCanvas);
    Luminous.Canvas.addEventListener('change', handleCanvas);
    Luminous.Canvas.addEventListener('unmount', handleCanvas);
    Luminous.Background.addEventListener('change', handleBackground);

    const unsubscribeHealth = subscribeUiHealth((health) => {
      const active = health.status !== 'booting';
      appActiveRef.current = active;
      setAppActive(active);
    });

    const unsubscribeSetting = Luminous.Settings.subscribe<boolean>(
      'dynamicBackground',
      (value) => {
        const nextEnabled = value !== false;
        backgroundEnabled.current = nextEnabled;
        setEnabled(nextEnabled);
      },
      { immediate: true },
    );
    const unsubscribePaletteSetting = Luminous.Settings.subscribe<boolean>(
      'dynamicPalette',
      (value) => {
        const nextEnabled = value !== false;
        paletteEnabled.current = nextEnabled;
        setDynamicPalette(nextEnabled);
      },
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
      Luminous.Background.removeEventListener('change', handleBackground);
      unsubscribeHealth();
      unsubscribeSetting();
      unsubscribePaletteSetting();
      unsubscribeSourceSetting();
      clearHandoffTimer();
      clearPaletteCommitTimer();
      clearTrackTransition();
      handoffDeadline.current = 0;
      Luminous.Background.destroy();
      Luminous.Palette.clear();
    };
  }, []);

  effect(() => {
    backgroundEnabled.current = enabled;
    paletteEnabled.current = dynamicPalette;
    appActiveRef.current = appActive;

    if (!enabled || !dynamicPalette) {
      Luminous.Palette.clear();
      return;
    }

    // Song changes deliberately do not trigger palette application here. The
    // old palette stays frozen while media changes underneath it and the new
    // palette is committed only after Background reports a settled layer.
    if (!appActive || Luminous.Background.getType() === 'none') return;

    void Luminous.Palette.applyFromImage(latestSongImage.current);
  }, [appActive, dynamicPalette, enabled]);

  effect(() => {
    // The background root is independent from Spotify's main-view DOM. Do not
    // destroy a perfectly valid frame when Spotify temporarily remounts its UI;
    // lifecycle cleanup still destroys it when the feature itself unmounts.
    if (!appActive) return;

    if (!enabled) {
      Luminous.Background.clear();
      return;
    }

    const hasFreshCanvas =
      backgroundSource === 'auto' &&
      canvas.video !== null &&
      canvas.revision > canvasRevisionFloor.current;

    if (hasFreshCanvas && canvas.video) {
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
