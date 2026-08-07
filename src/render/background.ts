export type BackgroundType = 'none' | 'image' | 'canvas';

export type BackgroundEvent = 'change';

export type BackgroundPhase = 'start' | 'settled';

export type BackgroundPayload = {
  type: BackgroundType;
  element: HTMLVideoElement | HTMLImageElement | null;
  phase: BackgroundPhase;
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
  private static readonly LAYER_CLASS_CLEANUP_GRACE_MS = 48;
  private static transitionMs = this.DEFAULT_TRANSITION_MS;
  private static readonly MAX_PRELOADED_IMAGES = 24;

  private static root: HTMLDivElement | null = null;
  private static base: HTMLDivElement | null = null;
  private static mediaStage: HTMLDivElement | null = null;
  private static holdLayer: HTMLCanvasElement | null = null;
  private static currentElement: BackgroundElement | null = null;
  private static stableLayer: HTMLElement | null = null;
  private static transitionFrame: number | null = null;
  private static transitionCleanupTimer: number | null = null;
  private static transitionRevision = 0;
  private static layerClassCleanupTimer: number | null = null;

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
    return this.currentType === 'none' ? null : this.currentElement;
  }

  static holdCurrentFrame(): void {
    const current = this.currentElement;
    if (
      this.currentType !== 'canvas' ||
      !(current instanceof HTMLVideoElement) ||
      this.stableLayer !== current
    ) {
      return;
    }

    // Freeze only Luminous's captured clone. Spotify's source video remains
    // untouched. First try to rasterize the last *presented* frame into an
    // independent canvas so source MediaStream teardown cannot black it out.
    // If Chromium refuses the snapshot, pausing the clone is still safer than
    // letting it follow a source that Spotify is about to replace.
    if (this.captureHoldFrame(current)) return;

    try {
      current.pause();
    } catch (error) {
      Luminous.Logger.warn('Background', 'Could not hold Canvas frame', error);
    }
  }

  private static captureHoldFrame(video: HTMLVideoElement): boolean {
    const hold = this.holdLayer;
    if (!hold || video.videoWidth <= 0 || video.videoHeight <= 0) return false;

    const viewportWidth = Math.max(1, window.innerWidth);
    const viewportHeight = Math.max(1, window.innerHeight);
    const pixelRatio = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
    const maxWidth = 1920;
    const desiredWidth = Math.round(viewportWidth * pixelRatio);
    const scaleDown = desiredWidth > maxWidth ? maxWidth / desiredWidth : 1;
    const width = Math.max(1, Math.round(desiredWidth * scaleDown));
    const height = Math.max(
      1,
      Math.round(viewportHeight * pixelRatio * scaleDown),
    );

    try {
      hold.width = width;
      hold.height = height;
      const context = hold.getContext('2d', { alpha: false });
      if (!context) return false;

      const sourceWidth = video.videoWidth;
      const sourceHeight = video.videoHeight;
      const scale = Math.max(width / sourceWidth, height / sourceHeight);
      const drawWidth = sourceWidth * scale;
      const drawHeight = sourceHeight * scale;
      const drawX = (width - drawWidth) / 2;
      const drawY = (height - drawHeight) / 2;

      context.drawImage(video, drawX, drawY, drawWidth, drawHeight);

      const computed = getComputedStyle(video);
      hold.style.translate = computed.translate;
      hold.style.scale = computed.scale;
      hold.style.zIndex = '1';
      this.setOpacityImmediately(hold, '1');
      this.setOpacityImmediately(video, '0');
      video.style.zIndex = '0';
      this.stableLayer = hold;

      try {
        video.pause();
      } catch {
        // The independent raster is already stable; playback state is now
        // irrelevant and cleanup will release the stream after handoff.
      }

      return true;
    } catch (error) {
      this.clearHoldLayer();
      Luminous.Logger.warn(
        'Background',
        'Could not snapshot outgoing Canvas frame',
        error,
      );
      return false;
    }
  }

  private static clearHoldLayer(): void {
    const hold = this.holdLayer;
    if (!hold) return;

    this.setOpacityImmediately(hold, '0');
    hold.style.zIndex = '0';
    hold.style.removeProperty('translate');
    hold.style.removeProperty('scale');

    const context = hold.getContext('2d');
    context?.clearRect(0, 0, hold.width, hold.height);
    hold.width = 1;
    hold.height = 1;
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

  private static emit(
    event: BackgroundEvent,
    phase: BackgroundPhase = 'settled',
  ) {
    const payload: BackgroundPayload = {
      type: this.currentType,
      element: this.get(),
      phase,
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
      transform: 'scale(1.2) translateZ(0)',
      pointerEvents: 'none',
      transition: 'opacity var(--luminous-transition-duration) ease',
      opacity: '0',
      zIndex: '0',
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
    this.cancelTransition();
    this.cancelLayerClassCleanup();
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
      zIndex: '1',
      willChange: 'opacity',
    });

    this.mediaStage = document.createElement('div');
    this.mediaStage.className = 'luminous-media-stage';
    Object.assign(this.mediaStage.style, {
      position: 'absolute',
      inset: '0',
      zIndex: '1',
      overflow: 'hidden',
      pointerEvents: 'none',
      filter:
        'blur(var(--luminous-background-blur)) brightness(var(--luminous-background-brightness))',
      willChange: 'filter',
    });

    this.holdLayer = document.createElement('canvas');
    this.holdLayer.className = 'luminous-background-hold';
    Object.assign(this.holdLayer.style, this.baseStyle());
    this.holdLayer.style.opacity = '0';

    const imageA = this.createImageLayer();
    const imageB = this.createImageLayer();
    const videoA = this.createVideoLayer();
    const videoB = this.createVideoLayer();
    const effects = this.createEffectsLayer();

    this.mediaStage.append(imageA, imageB, videoA, videoB, this.holdLayer);
    this.root.append(this.base, this.mediaStage, effects);
    this.imageLayers = [imageA, imageB];
    this.videoLayers = [videoA, videoB];
    this.activeImage = 0;
    this.activeVideo = 0;
    this.currentType = 'none';
    this.currentElement = null;
    this.stableLayer = this.base;
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

        const hasFrame = await this.waitForFirstVideoFrame(next);
        if (!this.isPendingCanvas(renderId, next)) return;

        if (!hasFrame) {
          const currentFallback = this.pendingCanvasFallback;
          this.clearPendingCanvas();
          this.resetVideo(next);
          Luminous.Logger.warn(
            'Background',
            'Canvas stream produced no presentable frame before timeout',
            sourceVideo,
          );

          if (currentFallback) {
            this.renderImage(currentFallback);
          } else if (this.currentType === 'none') {
            this.clear();
          }
          return;
        }

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
          if (currentFallback) {
            this.renderImage(currentFallback);
          } else if (this.currentType === 'none') {
            this.clear();
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

  static destroy() {
    this.imageRenderId++;
    this.videoRenderId++;
    this.currentCanvasSource = null;
    this.currentCanvasKey = null;
    this.cancelPendingCanvas();

    this.cancelVideoCleanup();
    this.cancelTransition();
    this.cancelLayerClassCleanup();
    this.videoLayers?.forEach((video) => this.resetVideo(video));
    this.clearHoldLayer();
    this.root?.remove();

    this.root = null;
    this.base = null;
    this.mediaStage = null;
    this.holdLayer = null;
    this.currentElement = null;
    this.stableLayer = null;
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
    if (!this.imageLayers || !this.videoLayers || !this.base) return;
    if (this.currentType === type && this.currentElement === activeElement) {
      return;
    }

    const incomingLayer: HTMLElement =
      type === 'none' ? this.base : (activeElement ?? this.base);
    const stableLayer =
      this.stableLayer?.isConnected === true
        ? this.stableLayer
        : (this.currentElement ?? this.base);
    const mediaLayers: BackgroundElement[] = [
      ...this.imageLayers,
      ...this.videoLayers,
    ];
    const revision = ++this.transitionRevision;

    this.cancelTransition(false);
    this.cancelLayerClassCleanup();

    // A symmetric opacity cross-fade creates an alpha trough: at the midpoint
    // two 50%-opaque layers cover only ~75% of the dark base. Because most of
    // the Spotify UI is translucent, that luminance dip reads as a full-window
    // flash. Keep one fully opaque stable layer underneath and reveal only the
    // incoming layer above it. The stable layer is removed after the incoming
    // layer reaches 100%, so every rendered frame remains fully covered.
    mediaLayers.forEach((element) => {
      if (element !== stableLayer && element !== incomingLayer) {
        this.setOpacityImmediately(element, '0');
        element.style.zIndex = '0';
        element.classList.remove('luminous-background-layer--active');
      }
    });

    if (
      stableLayer instanceof HTMLImageElement ||
      stableLayer instanceof HTMLVideoElement
    ) {
      stableLayer.classList.add('luminous-background-layer--active');
    }
    if (
      incomingLayer instanceof HTMLImageElement ||
      incomingLayer instanceof HTMLVideoElement
    ) {
      incomingLayer.classList.add('luminous-background-layer--active');
    }

    if (stableLayer !== incomingLayer) {
      this.setOpacityImmediately(stableLayer, '1');
      stableLayer.style.zIndex = '1';
      this.setOpacityImmediately(incomingLayer, '0');
      incomingLayer.style.zIndex = '2';
    } else {
      this.setOpacityImmediately(incomingLayer, '1');
      incomingLayer.style.zIndex = '1';
    }

    this.currentType = type;
    this.currentElement = type === 'none' ? null : activeElement;

    if (type !== 'canvas') {
      this.currentCanvasSource = null;
      this.currentCanvasKey = null;
    }

    if (stableLayer === incomingLayer || this.transitionMs === 0) {
      this.finishTransition(revision, stableLayer, incomingLayer, mediaLayers);
      return;
    }

    // Force the 0% state into the compositor before enabling the opacity
    // transition. A single rAF is then enough to begin the reveal without a
    // coalesced 0 -> 1 style update.
    void incomingLayer.offsetWidth;
    this.restoreOpacityTransition(incomingLayer);

    this.transitionFrame = requestAnimationFrame(() => {
      this.transitionFrame = null;
      if (revision !== this.transitionRevision) return;

      incomingLayer.style.opacity = '1';
      this.transitionCleanupTimer = window.setTimeout(() => {
        this.transitionCleanupTimer = null;
        this.finishTransition(
          revision,
          stableLayer,
          incomingLayer,
          mediaLayers,
        );
      }, this.transitionMs + this.LAYER_CLASS_CLEANUP_GRACE_MS);
    });

    this.scheduleVideoCleanup();
    this.emit('change', 'start');
  }

  private static finishTransition(
    revision: number,
    outgoingLayer: HTMLElement,
    incomingLayer: HTMLElement,
    mediaLayers: BackgroundElement[],
  ): void {
    if (revision !== this.transitionRevision) return;

    this.setOpacityImmediately(incomingLayer, '1');
    incomingLayer.style.zIndex = '1';

    if (outgoingLayer !== incomingLayer) {
      this.setOpacityImmediately(outgoingLayer, '0');
      outgoingLayer.style.zIndex = '0';
    }

    mediaLayers.forEach((element) => {
      if (element !== incomingLayer) {
        this.setOpacityImmediately(element, '0');
        element.style.zIndex = '0';
      }
    });

    this.stableLayer = incomingLayer;
    if (outgoingLayer === this.holdLayer) this.clearHoldLayer();
    this.restoreOpacityTransition(incomingLayer);
    this.scheduleLayerClassCleanup();
    this.scheduleVideoCleanup();
    this.emit('change');
  }

  private static setOpacityImmediately(
    element: HTMLElement,
    opacity: '0' | '1',
  ): void {
    element.style.transition = 'none';
    element.style.opacity = opacity;
  }

  private static restoreOpacityTransition(element: HTMLElement): void {
    element.style.transition =
      'opacity var(--luminous-transition-duration) ease';
  }

  private static cancelTransition(invalidate = true): void {
    if (invalidate) this.transitionRevision++;

    if (this.transitionFrame !== null) {
      cancelAnimationFrame(this.transitionFrame);
      this.transitionFrame = null;
    }

    if (this.transitionCleanupTimer !== null) {
      window.clearTimeout(this.transitionCleanupTimer);
      this.transitionCleanupTimer = null;
    }
  }

  private static scheduleLayerClassCleanup() {
    this.cancelLayerClassCleanup();

    this.layerClassCleanupTimer = window.setTimeout(() => {
      this.layerClassCleanupTimer = null;
      const current = this.currentElement;

      [...(this.imageLayers ?? []), ...(this.videoLayers ?? [])].forEach(
        (element) => {
          if (element !== current) {
            element.classList.remove('luminous-background-layer--active');
          }
        },
      );
    }, this.transitionMs + this.LAYER_CLASS_CLEANUP_GRACE_MS);
  }

  private static cancelLayerClassCleanup() {
    if (this.layerClassCleanupTimer === null) return;

    window.clearTimeout(this.layerClassCleanupTimer);
    this.layerClassCleanupTimer = null;
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
  ): Promise<boolean> {
    const frameVideo = video as FrameAwareVideo;

    if (typeof frameVideo.requestVideoFrameCallback !== 'function') {
      return new Promise((resolve) => {
        const startedAt = performance.now();

        const check = () => {
          if (
            video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            video.videoWidth > 0 &&
            video.videoHeight > 0
          ) {
            requestAnimationFrame(() => resolve(true));
            return;
          }

          if (performance.now() - startedAt >= this.VIDEO_FRAME_TIMEOUT_MS) {
            resolve(false);
            return;
          }

          requestAnimationFrame(check);
        };

        check();
      });
    }

    return new Promise((resolve) => {
      let settled = false;
      let frameHandle: number | null = null;

      const finish = (presented: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);

        if (
          frameHandle !== null &&
          typeof frameVideo.cancelVideoFrameCallback === 'function'
        ) {
          frameVideo.cancelVideoFrameCallback(frameHandle);
        }

        resolve(presented);
      };

      const timeoutId = window.setTimeout(
        () => finish(false),
        this.VIDEO_FRAME_TIMEOUT_MS,
      );
      frameHandle = frameVideo.requestVideoFrameCallback(() => finish(true));
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
