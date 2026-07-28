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

export class Background {
  private static readonly TRANSITION_MS = 250;
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
  private static pendingCanvasSource: HTMLVideoElement | null = null;
  private static pendingCanvasVideo: HTMLVideoElement | null = null;
  private static pendingCanvasFallback: string | null = null;
  private static videoCleanupTimer: number | null = null;
  private static unsupportedCanvasSources = new WeakSet<HTMLVideoElement>();

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
      transition: `opacity ${this.TRANSITION_MS}ms linear`,
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
    });

    this.base = document.createElement('div');
    this.base.className = 'luminous-base';

    Object.assign(this.base.style, {
      position: 'absolute',
      inset: '0',
      background: 'var(--spice-sidebar)',
      transition: `opacity ${this.TRANSITION_MS}ms linear`,
      opacity: '1',
    });

    const imageA = this.createImageLayer();
    const imageB = this.createImageLayer();
    const videoA = this.createVideoLayer();
    const videoB = this.createVideoLayer();

    this.root.append(this.base, imageA, imageB, videoA, videoB);
    this.imageLayers = [imageA, imageB];
    this.videoLayers = [videoA, videoB];
    this.activeImage = 0;
    this.activeVideo = 0;
    this.currentType = 'none';
    this.currentCanvasSource = null;
    this.clearPendingCanvas();

    document.body.prepend(this.root);
  }

  static render(options?: {
    image?: string | null;
    canvas?: HTMLVideoElement | null;
  }) {
    this.ensureBackground();

    if (!options || (!options.image && !options.canvas)) {
      this.clear();
      Luminous.Logger.info('Background', 'Rendering default layer');
      return;
    }

    if (options.canvas && this.renderCanvas(options.canvas, options.image)) {
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
    this.clearPendingCanvas();
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

    if (current.src === src && current.complete && current.naturalWidth > 0) {
      this.transitionTo('image', current);
      return;
    }

    const preload = this.getPreloadedImage(src);

    const showImage = () => {
      if (renderId !== this.imageRenderId) return;

      next.src = src;

      requestAnimationFrame(() => {
        if (renderId !== this.imageRenderId) return;

        this.activeImage = nextIndex;
        this.transitionTo('image', next);
        Luminous.Logger.info('Background', 'Rendering image layer', src);
      });
    };

    if (preload.complete && preload.naturalWidth > 0) {
      showImage();
      return;
    }

    preload.addEventListener('load', showImage, { once: true });
    preload.addEventListener(
      'error',
      () => {
        if (renderId !== this.imageRenderId) return;

        Luminous.Logger.warn('Background', 'Failed to load image', src);

        if (
          this.currentType === 'image' &&
          current.complete &&
          current.naturalWidth > 0
        ) {
          this.transitionTo('image', current);
          return;
        }

        this.clear();
      },
      { once: true },
    );
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
  ): boolean {
    this.ensureBackground();

    if (!this.videoLayers) {
      Luminous.Logger.warn('Background', 'No video layers for render');
      return false;
    }

    if (
      this.currentType === 'canvas' &&
      this.currentCanvasSource === sourceVideo &&
      this.get()?.isConnected
    ) {
      return true;
    }

    if (
      this.pendingCanvasSource === sourceVideo &&
      this.pendingCanvasVideo?.isConnected
    ) {
      if (fallbackImage !== undefined) {
        this.pendingCanvasFallback = fallbackImage;
      }

      return true;
    }

    if (this.unsupportedCanvasSources.has(sourceVideo)) {
      return false;
    }

    const captureStream = (sourceVideo as CapturableVideo).captureStream;
    let stream: MediaStream | undefined;

    try {
      stream = captureStream?.call(sourceVideo);
    } catch {
      this.unsupportedCanvasSources.add(sourceVideo);
      return false;
    }

    if (!stream) {
      this.unsupportedCanvasSources.add(sourceVideo);
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
    this.pendingCanvasVideo = next;
    this.pendingCanvasFallback = fallbackImage ?? null;

    void next
      .play()
      .then(() => {
        if (!this.isPendingCanvas(renderId, next)) return;

        requestAnimationFrame(() => {
          if (!this.isPendingCanvas(renderId, next)) return;

          this.clearPendingCanvas();
          this.activeVideo = nextIndex;
          this.currentCanvasSource = sourceVideo;
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

  static destroy() {
    this.imageRenderId++;
    this.videoRenderId++;
    this.currentCanvasSource = null;
    this.clearPendingCanvas();

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
    this.clearPendingCanvas();
    this.transitionTo('none');
  }

  private static transitionTo(
    type: BackgroundType,
    activeElement: BackgroundElement | null = null,
  ) {
    if (!this.imageLayers || !this.videoLayers) return;

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

  private static isPendingCanvas(
    renderId: number,
    video: HTMLVideoElement,
  ): boolean {
    return renderId === this.videoRenderId && this.pendingCanvasVideo === video;
  }

  private static clearPendingCanvas() {
    this.pendingCanvasSource = null;
    this.pendingCanvasVideo = null;
    this.pendingCanvasFallback = null;
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
    }, this.TRANSITION_MS);
  }

  private static cancelVideoCleanup() {
    if (this.videoCleanupTimer === null) return;

    window.clearTimeout(this.videoCleanupTimer);
    this.videoCleanupTimer = null;
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
