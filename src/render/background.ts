export type BackgroundType = 'none' | 'image' | 'canvas';

export type BackgroundEvent = 'change';

export type BackgroundPayload = {
  type: BackgroundType;
  element: HTMLVideoElement | HTMLImageElement | null;
};

export type BackgroundListener = (payload: BackgroundPayload) => void;

type BackgroundElement = HTMLVideoElement | HTMLImageElement;
type CapturableVideo = HTMLVideoElement & {
  captureStream?: () => MediaStream;
};

type FrameAwareVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (
    callback: (...args: unknown[]) => void,
  ) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

export class Background {
  private static readonly DEFAULT_TRANSITION_MS = 420;
  private static readonly VIDEO_FRAME_TIMEOUT_MS = 1200;
  private static readonly CLEANUP_GRACE_MS = 120;
  private static transitionMs = this.DEFAULT_TRANSITION_MS;
  private static readonly MAX_PRELOADED_IMAGES = 24;

  private static root: HTMLDivElement | null = null;
  private static base: HTMLDivElement | null = null;

  private static imageLayers: [HTMLImageElement, HTMLImageElement] | null =
    null;
  private static activeImage = 0;
  private static imageRenderId = 0;
  private static preloadedImages = new Map<string, HTMLImageElement>();

  private static videoLayers: [HTMLVideoElement, HTMLVideoElement] | null =
    null;
  private static activeVideo = 0;
  private static videoRenderId = 0;
  private static currentCanvasSource: HTMLVideoElement | null = null;
  private static currentCanvasKey: string | null = null;
  private static pendingCanvasSource: HTMLVideoElement | null = null;
  private static pendingCanvasKey: string | null = null;
  private static pendingCanvasVideo: HTMLVideoElement | null = null;
  private static pendingCanvasFallback: string | null = null;
  private static videoCleanupTimer: number | null = null;
  private static unsupportedCanvasSources = new WeakMap<
    HTMLVideoElement,
    Set<string>
  >();

  private static currentType: BackgroundType = 'none';

  private static listeners = new Map<
    BackgroundEvent,
    Set<BackgroundListener>
  >();

  static getType(): BackgroundType {
    return this.currentType;
  }

  static get(): HTMLVideoElement | HTMLImageElement | null {
    if (this.currentType === 'canvas' && this.videoLayers) {
      return this.videoLayers[this.activeVideo];
    }

    if (this.currentType === 'image' && this.imageLayers) {
      return this.imageLayers[this.activeImage];
    }

    return null;
  }

  static addEventListener(
    event: BackgroundEvent,
    listener: BackgroundListener,
  ) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(listener);
  }

  static removeEventListener(
    event: BackgroundEvent,
    listener: BackgroundListener,
  ) {
    this.listeners.get(event)?.delete(listener);
  }

  private static emit(event: BackgroundEvent) {
    const payload: BackgroundPayload = {
      type: this.currentType,
      element: this.get(),
    };

    this.listeners.get(event)?.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        Luminous.Logger.error('Background', 'Listener failed', error);
      }
    });
  }

  private static baseStyle(): Partial<CSSStyleDeclaration> {
    return {
      position: 'absolute',
      inset: '0',
      width: '120%',
      height: '120%',
      objectFit: 'cover',
      filter: `blur(var(--luminous-background-blur)) brightness(var(--luminous-background-brightness))`,
      transform: 'scale(1.2) translateZ(0)',
      pointerEvents: 'none',
      transition: 'opacity var(--luminous-transition-duration) ease',
      opacity: '0',
      willChange: 'opacity, transform',
    };
  }

  private static createImageLayer(): HTMLImageElement {
    const image = document.createElement('img');
    Object.assign(image.style, this.baseStyle());
    image.alt = '';
    image.decoding = 'async';

    Luminous.Logger.info('Background', 'Created image layer', image);

    return image;
  }

  private static createVideoLayer(): HTMLVideoElement {
    const video = document.createElement('video');
    Object.assign(video.style, this.baseStyle());

    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.loop = true;

    Luminous.Logger.info('Background', 'Created video layer', video);

    return video;
  }

  private static createEffectsLayer(): HTMLDivElement {
    const effects = document.createElement('div');
    effects.className = 'luminous-background-effects';

    const mesh = document.createElement('span');
    mesh.className = 'luminous-background-mesh';

    const halo = document.createElement('span');
    halo.className = 'luminous-background-halo';

    const ribbons = ['one', 'two'].map((variant) => {
      const ribbon = document.createElement('span');
      ribbon.className = `luminous-background-ribbon luminous-background-ribbon--${variant}`;
      return ribbon;
    });

    const blobs = ['one', 'two', 'three', 'four'].map((variant) => {
      const blob = document.createElement('span');
      blob.className = `luminous-background-blob luminous-background-blob--${variant}`;
      return blob;
    });

    const shimmer = document.createElement('span');
    shimmer.className = 'luminous-background-shimmer';

    const sparkles = document.createElement('span');
    sparkles.className = 'luminous-background-sparkles';

    const vignette = document.createElement('span');
    vignette.className = 'luminous-background-vignette';

    const grain = document.createElement('span');
    grain.className = 'luminous-background-grain';

    effects.append(
      mesh,
      halo,
      ...ribbons,
      ...blobs,
      shimmer,
      sparkles,
      vignette,
      grain,
    );
    return effects;
  }

  private static ensureBackground() {
    if (this.root?.isConnected) return;

    this.cancelVideoCleanup();
    this.videoLayers?.forEach((video) => this.resetVideo(video));
    this.root?.remove();
    this.root = document.createElement('div');
    this.root.id = 'luminous-dynamic-background';
    this.root.setAttribute('aria-hidden', 'true');

    Object.assign(this.root.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '0',
      overflow: 'hidden',
      pointerEvents: 'none',
      isolation: 'isolate',
    });

    this.base = document.createElement('div');
    this.base.className = 'luminous-base';

    Object.assign(this.base.style, {
      position: 'absolute',
      inset: '0',
      background: 'var(--spice-sidebar)',
      transition: 'opacity var(--luminous-transition-duration) ease',
      opacity: '1',
    });

    const imageA = this.createImageLayer();
    const imageB = this.createImageLayer();
    const videoA = this.createVideoLayer();
    const videoB = this.createVideoLayer();
    const effects = this.createEffectsLayer();

    this.root.append(this.base, imageA, imageB, videoA, videoB, effects);
    this.imageLayers = [imageA, imageB];
    this.videoLayers = [videoA, videoB];
    this.activeImage = 0;
    this.activeVideo = 0;
    this.currentType = 'none';
    this.currentCanvasSource = null;
    this.currentCanvasKey = null;
    this.clearPendingCanvas();

    document.body.prepend(this.root);
  }

  static render(options?: {
    image?: string | null;
    canvas?: HTMLVideoElement | null;
    canvasSource?: string | null;
  }) {
    this.ensureBackground();

    if (!options || (!options.image && !options.canvas)) {
      this.clear();
      Luminous.Logger.info('Background', 'Rendering default layer');
      return;
    }

    if (
      options.canvas &&
      this.renderCanvas(
        options.canvas,
        options.image,
        options.canvasSource ?? null,
      )
    ) {
      return;
    }

    if (options.image) {
      this.renderImage(options.image);
      return;
    }

    this.clear();
  }

  static preloadImage(src: string | null | undefined) {
    if (!src || this.preloadedImages.has(src)) return;

    const image = new Image();
    image.decoding = 'async';
    image.src = src;
    this.preloadedImages.set(src, image);
    this.trimPreloadedImages();
  }

  private static renderImage(src: string | null) {
    this.ensureBackground();
    this.videoRenderId++;
    this.currentCanvasSource = null;
    this.currentCanvasKey = null;
    this.cancelPendingCanvas();

    if (!this.imageLayers) {
      Luminous.Logger.warn('Background', 'No image layers for render');
      return;
    }

    if (!src) {
      Luminous.Logger.warn('Background', 'No image src for render');
      this.clear();
      return;
    }

    const renderId = ++this.imageRenderId;
    const nextIndex = this.activeImage === 0 ? 1 : 0;
    const current = this.imageLayers[this.activeImage];
    const next = this.imageLayers[nextIndex];

    if (
      this.currentType === 'image' &&
      current.src === src &&
      current.complete &&
      current.naturalWidth > 0
    ) {
      this.transitionTo('image', current);
      return;
    }

    const preload = this.getPreloadedImage(src);

    const keepCurrentOrClear = () => {
      if (renderId !== this.imageRenderId) return;

      Luminous.Logger.warn('Background', 'Failed to load image', src);
      if (this.currentType !== 'none' && this.get()?.isConnected) return;
      this.clear();
    };

    const prepareLayer = async () => {
      if (renderId !== this.imageRenderId) return;

      next.src = src;

      try {
        await next.decode();
      } catch {
        if (!next.complete || next.naturalWidth === 0) {
          keepCurrentOrClear();
          return;
        }
      }

      if (
        renderId !== this.imageRenderId ||
        !next.complete ||
        next.naturalWidth === 0
      ) {
        return;
      }

      requestAnimationFrame(() => {
        if (renderId !== this.imageRenderId) return;

        this.activeImage = nextIndex;
        this.transitionTo('image', next);
        Luminous.Logger.info('Background', 'Rendering image layer', src);
      });
    };

    if (preload.complete && preload.naturalWidth > 0) {
      void prepareLayer();
      return;
    }

    preload.addEventListener('load', () => void prepareLayer(), { once: true });
    preload.addEventListener('error', keepCurrentOrClear, { once: true });
  }

  private static getPreloadedImage(src: string): HTMLImageElement {
    let image = this.preloadedImages.get(src);

    if (image?.complete && image.naturalWidth === 0) {
      this.preloadedImages.delete(src);
      image = undefined;
    }

    if (!image) {
      image = new Image();
      image.decoding = 'async';
      image.src = src;
      this.preloadedImages.set(src, image);
      this.trimPreloadedImages();
    }

    return image;
  }

  private static trimPreloadedImages() {
    while (this.preloadedImages.size > this.MAX_PRELOADED_IMAGES) {
      const oldestKey = this.preloadedImages.keys().next().value as
        string | undefined;

      if (!oldestKey) return;
      this.preloadedImages.delete(oldestKey);
    }
  }

  private static renderCanvas(
    sourceVideo: HTMLVideoElement,
    fallbackImage?: string | null,
    sourceKey?: string | null,
  ): boolean {
    this.ensureBackground();

    if (!this.videoLayers) {
      Luminous.Logger.warn('Background', 'No video layers for render');
      return false;
    }

    const canvasKey =
      (sourceKey ?? sourceVideo.currentSrc) || sourceVideo.src || null;

    if (
      this.currentType === 'canvas' &&
      this.currentCanvasSource === sourceVideo &&
      this.currentCanvasKey === canvasKey &&
      this.isCanvasLayerUsable(this.get())
    ) {
      return true;
    }

    if (
      this.pendingCanvasSource === sourceVideo &&
      this.pendingCanvasKey === canvasKey &&
      this.pendingCanvasVideo?.isConnected
    ) {
      if (fallbackImage !== undefined) {
        this.pendingCanvasFallback = fallbackImage;
      }

      return true;
    }

    if (this.pendingCanvasVideo) {
      this.videoRenderId++;
      this.cancelPendingCanvas();
    }

    if (this.isUnsupportedCanvasSource(sourceVideo, canvasKey)) return false;

    if (
      !sourceVideo.isConnected ||
      sourceVideo.ended ||
      sourceVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      return false;
    }

    const captureStream = (sourceVideo as CapturableVideo).captureStream;
    if (typeof captureStream !== 'function') {
      this.markUnsupportedCanvasSource(sourceVideo, canvasKey);
      return false;
    }

    let stream: MediaStream;

    try {
      stream = captureStream.call(sourceVideo);
    } catch (error) {
      if (this.isPermanentCanvasError(error)) {
        this.markUnsupportedCanvasSource(sourceVideo, canvasKey);
      }
      return false;
    }

    if (stream.getVideoTracks().length === 0) {
      stream.getTracks().forEach((track) => track.stop());
      return false;
    }

    this.cancelVideoCleanup();
    this.imageRenderId++;

    const nextIndex = this.activeVideo === 0 ? 1 : 0;
    const next = this.videoLayers[nextIndex];
    const renderId = ++this.videoRenderId;

    this.resetVideo(next);
    next.style.opacity = '0';
    next.srcObject = stream;

    this.pendingCanvasSource = sourceVideo;
    this.pendingCanvasKey = canvasKey;
    this.pendingCanvasVideo = next;
    this.pendingCanvasFallback = fallbackImage ?? null;

    void next
      .play()
      .then(async () => {
        if (!this.isPendingCanvas(renderId, next)) return;

        await this.waitForFirstVideoFrame(next);
        if (!this.isPendingCanvas(renderId, next)) return;

        requestAnimationFrame(() => {
          if (!this.isPendingCanvas(renderId, next)) return;

          this.clearPendingCanvas();
          this.activeVideo = nextIndex;
          this.currentCanvasSource = sourceVideo;
          this.currentCanvasKey = canvasKey;
          this.transitionTo('canvas', next);
          Luminous.Logger.info(
            'Background',
            'Rendering canvas layer',
            sourceVideo,
          );
        });
      })
      .catch((error) => {
        if (!this.isPendingCanvas(renderId, next)) return;

        const currentFallback = this.pendingCanvasFallback;
        this.clearPendingCanvas();
        this.resetVideo(next);

        if (this.isInterruptedPlayback(error)) {
          if (this.currentType === 'none' && currentFallback) {
            this.renderImage(currentFallback);
          }
          return;
        }

        if (this.isPermanentCanvasError(error)) {
          this.markUnsupportedCanvasSource(sourceVideo, canvasKey);
        }

        Luminous.Logger.warn(
          'Background',
          'Failed to play canvas stream',
          error,
        );

        if (currentFallback) {
          this.renderImage(currentFallback);
        } else {
          this.clear();
        }
      });

    return true;
  }

  static setTransitionDuration(duration: number): void {
    this.transitionMs = Number.isFinite(duration)
      ? Math.min(1200, Math.max(0, duration))
      : this.DEFAULT_TRANSITION_MS;
  }

  static setSuspended(_suspended: boolean): void {
    // Do not pause/play MediaStream-backed video here. Chromium can expose a
    // blank compositor frame immediately after resuming a captured stream,
    // which presents as a flash after Alt+Tab. The browser already throttles
    // hidden documents; Luminous only pauses its CSS motion via the root class.
  }

  static destroy() {
    this.imageRenderId++;
    this.videoRenderId++;
    this.currentCanvasSource = null;
    this.currentCanvasKey = null;
    this.cancelPendingCanvas();

    this.cancelVideoCleanup();
    this.videoLayers?.forEach((video) => this.resetVideo(video));
    this.root?.remove();

    this.root = null;
    this.base = null;
    this.imageLayers = null;
    this.videoLayers = null;
    this.activeImage = 0;
    this.activeVideo = 0;
    this.currentType = 'none';
    this.emit('change');
  }

  static clear() {
    this.imageRenderId++;
    this.videoRenderId++;
    this.currentCanvasSource = null;
    this.currentCanvasKey = null;
    this.cancelPendingCanvas();
    this.transitionTo('none');
  }

  private static transitionTo(
    type: BackgroundType,
    activeElement: BackgroundElement | null = null,
  ) {
    if (!this.imageLayers || !this.videoLayers) return;
    if (this.currentType === type && this.get() === activeElement) return;

    this.currentType = type;

    if (this.base) {
      this.base.style.opacity = type === 'none' ? '1' : '0';
    }

    this.imageLayers.forEach((element) => {
      const active = type === 'image' && element === activeElement;
      element.style.opacity = active ? '1' : '0';
      element.classList.toggle('luminous-background-layer--active', active);
    });

    this.videoLayers.forEach((element) => {
      const active = type === 'canvas' && element === activeElement;
      element.style.opacity = active ? '1' : '0';
      element.classList.toggle('luminous-background-layer--active', active);
    });

    this.scheduleVideoCleanup();
    this.emit('change');
  }

  private static isCanvasLayerUsable(
    element: BackgroundElement | null,
  ): element is HTMLVideoElement {
    if (!(element instanceof HTMLVideoElement) || !element.isConnected) {
      return false;
    }

    const stream = element.srcObject;
    return (
      stream instanceof MediaStream &&
      stream.getVideoTracks().some((track) => track.readyState === 'live')
    );
  }

  private static isPendingCanvas(
    renderId: number,
    video: HTMLVideoElement,
  ): boolean {
    return renderId === this.videoRenderId && this.pendingCanvasVideo === video;
  }

  private static clearPendingCanvas() {
    this.pendingCanvasSource = null;
    this.pendingCanvasKey = null;
    this.pendingCanvasVideo = null;
    this.pendingCanvasFallback = null;
  }

  private static cancelPendingCanvas() {
    const pendingVideo = this.pendingCanvasVideo;
    this.clearPendingCanvas();

    if (pendingVideo) this.resetVideo(pendingVideo);
  }

  private static scheduleVideoCleanup() {
    this.cancelVideoCleanup();

    this.videoCleanupTimer = window.setTimeout(() => {
      this.videoCleanupTimer = null;

      const activeVideo =
        this.currentType === 'canvas' && this.videoLayers
          ? this.videoLayers[this.activeVideo]
          : null;
      const pendingVideo = this.pendingCanvasVideo;

      this.videoLayers?.forEach((video) => {
        if (video !== activeVideo && video !== pendingVideo) {
          this.resetVideo(video);
        }
      });
    }, this.transitionMs + this.CLEANUP_GRACE_MS);
  }

  private static cancelVideoCleanup() {
    if (this.videoCleanupTimer === null) return;

    window.clearTimeout(this.videoCleanupTimer);
    this.videoCleanupTimer = null;
  }

  private static waitForFirstVideoFrame(
    video: HTMLVideoElement,
  ): Promise<void> {
    const frameVideo = video as FrameAwareVideo;

    if (typeof frameVideo.requestVideoFrameCallback !== 'function') {
      return new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    }

    return new Promise((resolve) => {
      let settled = false;
      let frameHandle: number | null = null;

      const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);

        if (
          frameHandle !== null &&
          typeof frameVideo.cancelVideoFrameCallback === 'function'
        ) {
          frameVideo.cancelVideoFrameCallback(frameHandle);
        }

        resolve();
      };

      const timeoutId = window.setTimeout(finish, this.VIDEO_FRAME_TIMEOUT_MS);
      frameHandle = frameVideo.requestVideoFrameCallback(() => finish());
    });
  }

  private static isUnsupportedCanvasSource(
    video: HTMLVideoElement,
    source: string | null,
  ): boolean {
    if (!source) return false;
    return this.unsupportedCanvasSources.get(video)?.has(source) ?? false;
  }

  private static markUnsupportedCanvasSource(
    video: HTMLVideoElement,
    source: string | null,
  ): void {
    if (!source) return;

    let sources = this.unsupportedCanvasSources.get(video);
    if (!sources) {
      sources = new Set();
      this.unsupportedCanvasSources.set(video, sources);
    }

    sources.add(source);
  }

  private static getErrorName(error: unknown): string | null {
    if (typeof error !== 'object' || error === null || !('name' in error)) {
      return null;
    }

    return typeof error.name === 'string' ? error.name : null;
  }

  private static isInterruptedPlayback(error: unknown): boolean {
    return this.getErrorName(error) === 'AbortError';
  }

  private static isPermanentCanvasError(error: unknown): boolean {
    const name = this.getErrorName(error);
    return name === 'NotSupportedError' || name === 'SecurityError';
  }

  private static resetVideo(video: HTMLVideoElement) {
    video.onplaying = null;
    video.pause();

    const stream = video.srcObject;
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    video.srcObject = null;
    video.removeAttribute('src');
    video.load();
  }
}
