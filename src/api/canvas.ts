import {
  CanvasEvent,
  CanvasListener,
  CanvasMode,
  CanvasPayload,
} from '../types/runtime/canvas.types';

const MEDIA_SOURCE_EVENTS: Array<keyof HTMLMediaElementEventMap> = [
  'loadedmetadata',
  'loadeddata',
  'canplay',
  'playing',
  'emptied',
  'ended',
];

export class Canvas {
  private static readonly VIDEO_CANDIDATES: ReadonlyArray<{
    selector: string;
    mode: Exclude<CanvasMode, null>;
  }> = [
    { selector: '.canvasVideoContainerNPV video', mode: 'npv' },
    { selector: '#VideoPlayerNpv_ReactPortal video', mode: 'npv-video' },
    {
      selector:
        '.Root__top-container:has(#VideoPlayerCinema_ReactPortal) video',
      mode: 'cinema',
    },
  ];

  private static listeners = new Map<CanvasEvent, Set<CanvasListener>>();
  private static observer: MutationObserver | null = null;
  private static checkFrame: number | null = null;
  private static currentVideo: HTMLVideoElement | null = null;
  private static currentMode: CanvasMode = null;
  private static currentSource: string | null = null;
  private static revision = 0;
  private static observedSourceVideo: HTMLVideoElement | null = null;
  private static initialized = false;
  private static enabled = true;

  private static readonly handleVideoSourceChange = () => {
    this.scheduleCheck();
  };

  static addEventListener(event: CanvasEvent, listener: CanvasListener): void {
    this.getListeners(event).add(listener);

    if (
      (event === 'mount' || event === 'change') &&
      this.currentVideo &&
      this.currentMode
    ) {
      this.callListener(listener, this.get());
    }

    if (this.enabled && !this.initialized) this.init();
  }

  static removeEventListener(
    event: CanvasEvent,
    listener: CanvasListener,
  ): void {
    this.listeners.get(event)?.delete(listener);
  }

  static get(): CanvasPayload {
    return this.createPayload(
      this.currentVideo,
      this.currentMode,
      this.currentSource,
    );
  }

  static getVideo(): HTMLVideoElement | null {
    return this.currentVideo;
  }

  static init(): void {
    if (!this.enabled || this.initialized) return;

    this.initialized = true;
    this.observer = new MutationObserver(() => this.scheduleCheck());
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'src'],
    });
    this.check();
  }

  static setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;

    if (enabled) {
      this.init();
      return;
    }

    const previousVideo = this.currentVideo;
    const previousMode = this.currentMode;
    const previousSource = this.currentSource;

    this.observer?.disconnect();
    this.observer = null;
    if (this.checkFrame !== null) {
      cancelAnimationFrame(this.checkFrame);
      this.checkFrame = null;
    }
    this.observeVideoSource(null);
    this.initialized = false;
    this.currentVideo = null;
    this.currentMode = null;
    this.currentSource = null;

    if (previousVideo) {
      this.revision++;
      this.emit(
        'unmount',
        this.createPayload(null, previousMode, previousSource),
      );
    }
  }

  static destroy(): void {
    this.observer?.disconnect();
    this.observer = null;

    if (this.checkFrame !== null) {
      cancelAnimationFrame(this.checkFrame);
      this.checkFrame = null;
    }

    this.observeVideoSource(null);
    this.listeners.clear();
    this.currentVideo = null;
    this.currentMode = null;
    this.currentSource = null;
    this.revision = 0;
    this.initialized = false;
    this.enabled = true;
  }

  private static createPayload(
    video: HTMLVideoElement | null,
    mode: CanvasMode,
    source: string | null = video?.currentSrc || video?.src || null,
  ): CanvasPayload {
    return { video, mode, source, revision: this.revision };
  }

  private static scheduleCheck(): void {
    if (!this.initialized || this.checkFrame !== null) return;

    this.checkFrame = requestAnimationFrame(() => {
      this.checkFrame = null;
      this.check();
    });
  }

  private static detect(): {
    payload: CanvasPayload;
    observedVideo: HTMLVideoElement | null;
  } {
    let observedVideo: HTMLVideoElement | null = null;

    for (const candidate of this.VIDEO_CANDIDATES) {
      const videos = Array.from(
        document.querySelectorAll<HTMLVideoElement>(candidate.selector),
      );
      const visible = videos.filter((video) => this.isVisibleVideo(video));

      if (!observedVideo) {
        observedVideo =
          visible.find((video) => !video.ended) ?? visible[0] ?? null;
      }

      const playable = this.findBestPlayableVideo(visible);
      if (playable) {
        return {
          payload: this.createPayload(playable, candidate.mode),
          observedVideo: playable,
        };
      }
    }

    return {
      payload: this.createPayload(null, null, null),
      observedVideo,
    };
  }

  private static findBestPlayableVideo(
    videos: HTMLVideoElement[],
  ): HTMLVideoElement | null {
    const playable = videos.filter(
      (video) =>
        !video.ended &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0,
    );

    if (!playable.length) return null;

    return (
      playable.find((video) => !video.paused) ??
      playable.find(
        (video) => video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA,
      ) ??
      playable[0]
    );
  }

  private static isVisibleVideo(video: HTMLVideoElement): boolean {
    if (!video.isConnected || video.hidden) return false;

    const style = getComputedStyle(video);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number.parseFloat(style.opacity || '1') !== 0 &&
      video.getClientRects().length > 0
    );
  }

  private static check(): void {
    if (!this.initialized) return;

    const detection = this.detect();
    const detected = detection.payload;
    this.observeVideoSource(detection.observedVideo);

    const previousVideo = this.currentVideo;
    const previousMode = this.currentMode;
    const previousSource = this.currentSource;

    if (
      previousVideo === detected.video &&
      previousMode === detected.mode &&
      previousSource === detected.source
    ) {
      return;
    }

    this.currentVideo = detected.video;
    this.currentMode = detected.mode;
    this.currentSource = detected.source;
    this.revision++;

    if (previousVideo && !detected.video) {
      const payload = this.createPayload(null, previousMode, previousSource);
      Luminous.Logger.info('Canvas', 'Unmounted', payload);
      this.emit('unmount', payload);
      return;
    }

    if (!previousVideo && detected.video) {
      const payload = this.get();
      Luminous.Logger.info('Canvas', 'Mounted', payload);
      this.emit('mount', payload);
      return;
    }

    const payload = this.get();
    Luminous.Logger.info('Canvas', 'Changed', payload);
    this.emit('change', payload);
  }

  private static emit(event: CanvasEvent, payload: CanvasPayload): void {
    this.getListeners(event).forEach((listener) => {
      this.callListener(listener, payload);
    });
  }

  private static observeVideoSource(video: HTMLVideoElement | null): void {
    if (video === this.observedSourceVideo) return;

    MEDIA_SOURCE_EVENTS.forEach((event) => {
      this.observedSourceVideo?.removeEventListener(
        event,
        this.handleVideoSourceChange,
      );
    });

    this.observedSourceVideo = video;

    MEDIA_SOURCE_EVENTS.forEach((event) => {
      video?.addEventListener(event, this.handleVideoSourceChange);
    });
  }

  private static callListener(
    listener: CanvasListener,
    payload: CanvasPayload,
  ): void {
    try {
      listener(payload);
    } catch (error) {
      Luminous.Logger.error('Canvas', 'Listener failed', error);
    }
  }

  private static getListeners(event: CanvasEvent): Set<CanvasListener> {
    let listeners = this.listeners.get(event);

    if (!listeners) {
      listeners = new Set();
      this.listeners.set(event, listeners);
    }

    return listeners;
  }
}
