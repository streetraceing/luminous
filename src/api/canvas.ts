import {
  CanvasEvent,
  CanvasListener,
  CanvasMode,
  CanvasPayload,
} from '../types/runtime/canvas.types';
import { DomPulse, mutationTouchesSelector } from '../ui/domPulse';
import {
  CANVAS_SURFACE_SELECTOR,
  CINEMA_VIDEO_SKIP_SELECTOR,
  LEGACY_CANVAS_SELECTOR,
  NPV_CANVAS_VIDEO_SELECTOR,
  NPV_ROOT_SELECTOR,
  NPV_VIDEO_SELECTOR,
} from '../ui/mediaSelectors';

export class Canvas {
  private static readonly STRUCTURAL_SELECTOR = [
    NPV_ROOT_SELECTOR,
    CANVAS_SURFACE_SELECTOR,
    LEGACY_CANVAS_SELECTOR,
    '#Desktop_PanelContainer_Id',
    '#lyrics-cinema',
    'video',
  ].join(',');

  private static listeners = new Map<CanvasEvent, Set<CanvasListener>>();
  private static unsubscribeDomPulse: (() => void) | null = null;
  private static checkFrame: number | null = null;

  private static currentVideo: HTMLVideoElement | null = null;
  private static currentMode: CanvasMode = null;
  private static currentSource: string | null = null;
  private static currentPlayable = false;
  private static revision = 0;
  private static observedSourceVideo: HTMLVideoElement | null = null;
  private static uiSidebar: HTMLElement | null = null;
  private static uiCanvasFrameParent: HTMLElement | null = null;
  private static initialized = false;
  private static enabled = true;

  private static readonly handleVideoSourceChange = () => {
    this.scheduleCheck();
  };

  private static createPayload(
    video: HTMLVideoElement | null,
    mode: CanvasMode,
  ): CanvasPayload {
    return {
      video,
      mode,
      source: video?.currentSrc || video?.src || null,
      revision: this.revision,
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

    if (!this.initialized) this.init();
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
    if (this.initialized || !this.enabled) return;

    this.initialized = true;
    this.unsubscribeDomPulse = DomPulse.subscribe(() => this.scheduleCheck(), {
      immediate: false,
      filter: (records) =>
        mutationTouchesSelector(records, this.STRUCTURAL_SELECTOR),
    });
    this.check();
  }

  static setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;

    this.enabled = enabled;

    if (!enabled) {
      const previousVideo = this.currentVideo;
      const previousMode = this.currentMode;
      this.destroy(false);

      if (previousVideo) {
        this.revision++;
        this.emit('unmount', this.createPayload(null, previousMode));
      }
      return;
    }

    this.init();
  }

  static destroy(clearListeners = true): void {
    this.unsubscribeDomPulse?.();
    this.unsubscribeDomPulse = null;

    if (this.checkFrame !== null) {
      cancelAnimationFrame(this.checkFrame);
      this.checkFrame = null;
    }

    this.observeVideoSource(null);
    this.syncUiState(null, null);
    this.currentVideo = null;
    this.currentMode = null;
    this.currentSource = null;
    this.currentPlayable = false;
    this.initialized = false;

    if (clearListeners) this.listeners.clear();
  }

  private static scheduleCheck() {
    if (this.checkFrame !== null) return;

    this.checkFrame = requestAnimationFrame(() => {
      this.checkFrame = null;
      this.check();
    });
  }

  private static detect(): CanvasPayload {
    const npv = this.findVisibleVideo(NPV_CANVAS_VIDEO_SELECTOR);

    if (npv) return this.createPayload(npv, 'npv');

    const npvLongform = this.findVisibleVideo(NPV_VIDEO_SELECTOR, true);
    if (npvLongform) return this.createPayload(npvLongform, 'npv-video');

    // Promoted protected media lives in the shared background root. Keep its
    // identity/mode while the original NPV slot is still mounted.
    const promoted = Luminous.Background.getDirectVideoSource();
    if (promoted && !promoted.ended) {
      return this.createPayload(promoted, 'npv-video');
    }

    const cinema = this.findCinemaVideo();
    if (cinema) return this.createPayload(cinema, 'cinema');

    return this.createPayload(null, null);
  }

  private static findCinemaVideo(): HTMLVideoElement | null {
    for (const video of document.querySelectorAll('video')) {
      if (
        !video.closest('.Root__top-container') ||
        video.closest(CINEMA_VIDEO_SKIP_SELECTOR)
      ) {
        continue;
      }

      if (
        !video.isConnected ||
        video.ended ||
        video.getClientRects().length === 0
      ) {
        continue;
      }

      const style = getComputedStyle(video);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        return video;
      }
    }

    return null;
  }

  private static findVisibleVideo(
    selector: string,
    excludeCanvas = false,
  ): HTMLVideoElement | null {
    const videos = document.querySelectorAll<HTMLVideoElement>(selector);

    for (const video of videos) {
      // A hidden or ended Canvas must not fall through to protected-video
      // handling, which reparents the original Spotify player.
      if (
        excludeCanvas &&
        video.closest(`${CANVAS_SURFACE_SELECTOR},${LEGACY_CANVAS_SELECTOR}`)
      ) {
        continue;
      }

      if (
        !video.isConnected ||
        video.ended ||
        video.getClientRects().length === 0
      ) {
        continue;
      }

      const style = getComputedStyle(video);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        return video;
      }
    }

    return null;
  }

  private static isPlayable(video: HTMLVideoElement | null): boolean {
    return !!(
      video &&
      video.isConnected &&
      !video.ended &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      video.videoWidth > 0 &&
      video.videoHeight > 0
    );
  }

  private static check() {
    const { video, mode, source } = this.detect();
    const playable = this.isPlayable(video);
    const previousVideo = this.currentVideo;
    const previousMode = this.currentMode;

    // React can move the same video into a replacement frame/sidebar without
    // changing its source. Refresh reversible UI markers even in that case.
    this.syncUiState(video, mode);

    if (
      previousVideo === video &&
      previousMode === mode &&
      this.currentSource === source &&
      this.currentPlayable === playable
    ) {
      return;
    }

    this.currentVideo = video;
    this.currentMode = mode;
    this.currentSource = source;
    this.currentPlayable = playable;
    this.revision++;
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

    const events: Array<keyof HTMLMediaElementEventMap> = [
      'loadedmetadata',
      'loadeddata',
      'canplay',
      'playing',
      'emptied',
      'ended',
    ];

    events.forEach((event) => {
      this.observedSourceVideo?.removeEventListener(
        event,
        this.handleVideoSourceChange,
      );
    });
    this.observedSourceVideo = video;

    events.forEach((event) => {
      video?.addEventListener(event, this.handleVideoSourceChange, {
        passive: true,
      });
    });
  }

  private static syncUiState(
    video: HTMLVideoElement | null,
    mode: CanvasMode,
  ): void {
    const surface =
      video && mode === 'npv'
        ? video.closest<HTMLElement>(CANVAS_SURFACE_SELECTOR)
        : null;
    const legacyContainer =
      video && mode === 'npv' && !surface
        ? video.closest<HTMLElement>(LEGACY_CANVAS_SELECTOR)
        : null;
    const container = surface ?? legacyContainer;
    const nextSidebar =
      container?.closest<HTMLElement>('#Desktop_PanelContainer_Id') ??
      container?.closest<HTMLElement>(NPV_ROOT_SELECTOR) ??
      null;
    // The new surface owns the draggable/video wrappers; its immediate parent
    // is the visual frame. Only the legacy tree uses the old two-level offset.
    const nextFrameParent = surface
      ? surface.parentElement
      : (legacyContainer?.parentElement?.parentElement ?? null);

    if (nextSidebar !== this.uiSidebar) {
      this.uiSidebar?.classList.remove('luminous-has-canvas');
      this.uiSidebar = nextSidebar;
      this.uiSidebar?.classList.add('luminous-has-canvas');
    }

    if (nextFrameParent !== this.uiCanvasFrameParent) {
      this.uiCanvasFrameParent?.classList.remove(
        'luminous-canvas-frame-parent',
      );
      this.uiCanvasFrameParent = nextFrameParent;
      this.uiCanvasFrameParent?.classList.add('luminous-canvas-frame-parent');
    }
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
