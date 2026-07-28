import {
  CanvasEvent,
  CanvasListener,
  CanvasMode,
  CanvasPayload,
} from '../types/runtime/canvas.types';

export class Canvas {
  private static readonly NPV_VIDEO_SELECTOR = '.canvasVideoContainerNPV video';
  private static readonly NPV_LONGFORM_VIDEO_SELECTOR =
    '#VideoPlayerNpv_ReactPortal video';
  private static readonly CINEMA_VIDEO_SELECTOR =
    '.Root__top-container:has(#VideoPlayerCinema_ReactPortal) video';

  private static listeners = new Map<CanvasEvent, Set<CanvasListener>>();
  private static observer: MutationObserver | null = null;
  private static checkFrame: number | null = null;

  private static currentVideo: HTMLVideoElement | null = null;
  private static currentMode: CanvasMode = null;
  private static currentSource: string | null = null;
  private static observedSourceVideo: HTMLVideoElement | null = null;
  private static readonly handleVideoSourceChange = () => this.scheduleCheck();
  private static initialized = false;

  private static createPayload(
    video: HTMLVideoElement | null,
    mode: CanvasMode,
  ): CanvasPayload {
    return {
      video,
      mode,
      source: video?.currentSrc || video?.src || null,
    };
  }

  static addEventListener(event: CanvasEvent, listener: CanvasListener) {
    this.getListeners(event).add(listener);

    if (
      (event === 'mount' || event === 'change') &&
      this.currentVideo &&
      this.currentMode
    ) {
      this.callListener(
        listener,
        this.createPayload(this.currentVideo, this.currentMode),
      );
    }

    if (!this.initialized) {
      this.init();
    }
  }

  static removeEventListener(event: CanvasEvent, listener: CanvasListener) {
    this.listeners.get(event)?.delete(listener);
  }

  static get(): CanvasPayload {
    return this.createPayload(this.currentVideo, this.currentMode);
  }

  static getVideo() {
    return this.currentVideo;
  }

  static init() {
    if (this.initialized) return;

    this.initialized = true;
    this.observer = new MutationObserver(() => this.scheduleCheck());
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    this.check();
  }

  private static scheduleCheck() {
    if (this.checkFrame !== null) return;

    this.checkFrame = requestAnimationFrame(() => {
      this.checkFrame = null;
      this.check();
    });
  }

  private static detect(): CanvasPayload {
    const npv = document.querySelector(
      this.NPV_VIDEO_SELECTOR,
    ) as HTMLVideoElement | null;

    if (npv) {
      return this.createPayload(npv, 'npv');
    }

    const npvLongform = this.findVisibleVideo(this.NPV_LONGFORM_VIDEO_SELECTOR);
    if (npvLongform) {
      return this.createPayload(npvLongform, 'npv-video');
    }

    const cinema = document.querySelector(
      this.CINEMA_VIDEO_SELECTOR,
    ) as HTMLVideoElement | null;

    if (cinema) {
      return this.createPayload(cinema, 'cinema');
    }

    return this.createPayload(null, null);
  }

  private static findVisibleVideo(selector: string): HTMLVideoElement | null {
    const videos = document.querySelectorAll<HTMLVideoElement>(selector);

    return (
      Array.from(videos).find((video) => {
        const style = getComputedStyle(video);
        return (
          video.isConnected &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          !video.ended &&
          video.getClientRects().length > 0
        );
      }) ?? null
    );
  }

  private static check() {
    const { video, mode, source } = this.detect();

    const previousVideo = this.currentVideo;
    const previousMode = this.currentMode;

    if (
      previousVideo === video &&
      previousMode === mode &&
      this.currentSource === source
    ) {
      return;
    }

    this.currentVideo = video;
    this.currentMode = mode;
    this.currentSource = source;
    this.observeVideoSource(video);

    if (previousVideo && !video) {
      const payload = this.createPayload(null, previousMode);
      Luminous.Logger.info('Canvas', 'Unmounted', payload);
      this.emit('unmount', payload);
      return;
    }

    if (!previousVideo && video) {
      const payload = this.createPayload(video, mode);
      Luminous.Logger.info('Canvas', 'Mounted', payload);
      this.emit('mount', payload);
      return;
    }

    const payload = this.createPayload(video, mode);
    Luminous.Logger.info('Canvas', 'Changed', payload);
    this.emit('change', payload);
  }

  private static emit(event: CanvasEvent, payload: CanvasPayload) {
    this.getListeners(event).forEach((listener) => {
      this.callListener(listener, payload);
    });
  }

  private static observeVideoSource(video: HTMLVideoElement | null) {
    if (video === this.observedSourceVideo) return;

    this.observedSourceVideo?.removeEventListener(
      'loadedmetadata',
      this.handleVideoSourceChange,
    );
    this.observedSourceVideo?.removeEventListener(
      'emptied',
      this.handleVideoSourceChange,
    );
    this.observedSourceVideo?.removeEventListener(
      'ended',
      this.handleVideoSourceChange,
    );
    this.observedSourceVideo = video;

    video?.addEventListener('loadedmetadata', this.handleVideoSourceChange);
    video?.addEventListener('emptied', this.handleVideoSourceChange);
    video?.addEventListener('ended', this.handleVideoSourceChange);
  }

  private static callListener(
    listener: CanvasListener,
    payload: CanvasPayload,
  ) {
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
