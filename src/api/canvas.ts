import {
  CanvasEvent,
  CanvasListener,
  CanvasMode,
  CanvasPayload,
} from '../types/runtime/canvas.types';

export class Canvas {
  private static readonly ROOT_SELECTOR = '.Root__top-container';
  private static readonly NPV_VIDEO_SELECTOR = '.canvasVideoContainerNPV video';
  private static readonly CINEMA_VIDEO_SELECTOR =
    '.Root__top-container:has(#VideoPlayerCinema_ReactPortal) video';

  private static listeners = new Map<CanvasEvent, Set<CanvasListener>>();
  private static observer: MutationObserver | null = null;

  private static currentVideo: HTMLVideoElement | null = null;
  private static currentMode: CanvasMode = null;

  private static initialized = false;

  private static createPayload(
    video: HTMLVideoElement | null,
    mode: CanvasMode,
  ): CanvasPayload {
    return { video, mode };
  }

  static addEventListener(event: CanvasEvent, listener: CanvasListener) {
    this.getListeners(event).add(listener);

    if (
      (event === 'mount' || event === 'change') &&
      this.currentVideo &&
      this.currentMode
    ) {
      listener(this.createPayload(this.currentVideo, this.currentMode));
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

    this.waitForRoot().then((root) => {
      this.observer = new MutationObserver(() => this.check());

      this.observer.observe(root, {
        childList: true,
        subtree: true,
      });

      this.check();
    });
  }

  private static waitForRoot(): Promise<HTMLElement> {
    return new Promise((resolve) => {
      const existing = document.querySelector(
        this.ROOT_SELECTOR,
      ) as HTMLElement | null;

      if (existing) {
        resolve(existing);
        return;
      }

      const obs = new MutationObserver(() => {
        const el = document.querySelector(
          this.ROOT_SELECTOR,
        ) as HTMLElement | null;

        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });

      obs.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  }

  private static detect(): CanvasPayload {
    const npv = document.querySelector(
      this.NPV_VIDEO_SELECTOR,
    ) as HTMLVideoElement | null;

    if (npv) {
      return this.createPayload(npv, 'npv');
    }

    const cinema = document.querySelector(
      this.CINEMA_VIDEO_SELECTOR,
    ) as HTMLVideoElement | null;

    if (cinema) {
      return this.createPayload(cinema, 'cinema');
    }

    return this.createPayload(null, null);
  }

  private static check() {
    const { video, mode } = this.detect();

    const prevVideo = this.currentVideo;
    const prevMode = this.currentMode;

    const videoChanged = prevVideo !== video;
    const modeChanged = prevMode !== mode;

    if (prevVideo && !video) {
      this.currentVideo = null;
      this.currentMode = null;

      const payload = this.createPayload(null, prevMode);

      Luminous.Logger.info('Canvas', 'Unmounted', payload);
      this.emit('unmount', payload);
      return;
    }

    if (!prevVideo && video) {
      this.currentVideo = video;
      this.currentMode = mode;

      const payload = this.createPayload(video, mode);

      Luminous.Logger.info('Canvas', 'Mounted', payload);
      this.emit('mount', payload);
      return;
    }

    if (videoChanged || modeChanged) {
      this.currentVideo = video;
      this.currentMode = mode;

      const payload = this.createPayload(video, mode);

      Luminous.Logger.info('Canvas', 'Changed', payload);
      this.emit('change', payload);
    }
  }

  private static emit(event: CanvasEvent, payload: CanvasPayload) {
    this.getListeners(event).forEach((listener) => {
      listener(payload);
    });
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
