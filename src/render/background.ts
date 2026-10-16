import type { CanvasMode } from '../types/runtime/canvas.types';

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
  private static mediaStage: HTMLDivElement | null = null;

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
  private static unsupportedCanvasSources = new WeakSet<HTMLVideoElement>();

  private static directVideoSource: HTMLVideoElement | null = null;
  private static directVideoKey: string | null = null;
  private static directVideoHosts = new Map<
    HTMLVideoElement,
    HTMLElement | null
  >();
  private static directVideoSlots = new Map<HTMLVideoElement, HTMLDivElement>();
  private static directVideoPlaceholders = new Map<
    HTMLDivElement,
    {
      element: HTMLDivElement;
      frame: HTMLElement;
      observer: ResizeObserver;
      sync: () => void;
      dispose: () => void;
      styles: Map<string, { value: string; priority: string }>;
    }
  >();
  private static directVideoCleanupTimers = new Map<HTMLVideoElement, number>();

  private static currentType: BackgroundType = 'none';

  private static listeners = new Map<
    BackgroundEvent,
    Set<BackgroundListener>
  >();

  static getType(): BackgroundType {
    return this.currentType;
  }

  static get(): HTMLVideoElement | HTMLImageElement | null {
    if (this.currentType === 'canvas' && this.directVideoSource?.isConnected) {
      return this.directVideoSource;
    }

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

    const createNode = (className: string) => {
      const node = document.createElement('span');
      node.className = className;

      const surface = document.createElement('span');
      surface.className = 'luminous-background-surface';
      node.append(surface);

      return node;
    };

    const mesh = createNode('luminous-background-mesh');
    const halo = createNode('luminous-background-halo');

    const ribbons = ['one', 'two'].map((variant) =>
      createNode(
        `luminous-background-ribbon luminous-background-ribbon--${variant}`,
      ),
    );

    const blobs = ['one', 'two', 'three', 'four'].map((variant) =>
      createNode(
        `luminous-background-blob luminous-background-blob--${variant}`,
      ),
    );

    effects.append(mesh, halo, ...ribbons, ...blobs);
    return effects;
  }

  private static ensureBackground() {
    if (this.root?.isConnected) return;

    this.restoreAllDirectVideos();
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
      contain: 'layout paint style',
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

    this.mediaStage = document.createElement('div');
    this.mediaStage.className = 'luminous-background-media-stage';
    Object.assign(this.mediaStage.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
    });

    const imageA = this.createImageLayer();
    const imageB = this.createImageLayer();
    const videoA = this.createVideoLayer();
    const videoB = this.createVideoLayer();
    const effects = this.createEffectsLayer();

    this.mediaStage.append(imageA, imageB, videoA, videoB);
    this.root.append(this.base, this.mediaStage, effects);
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
    canvasMode?: CanvasMode;
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
        options.canvasMode ?? null,
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

      void this.waitForImageReady(next).then((ready) => {
        if (!ready || renderId !== this.imageRenderId) return;

        requestAnimationFrame(() => {
          if (renderId !== this.imageRenderId) return;

          this.transitionTo('image', next);
          Luminous.Logger.info('Background', 'Rendering image layer', src);
        });
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

  private static async waitForImageReady(
    image: HTMLImageElement,
  ): Promise<boolean> {
    if (!image.complete) {
      const loaded = await new Promise<boolean>((resolve) => {
        const finish = (value: boolean) => {
          image.removeEventListener('load', handleLoad);
          image.removeEventListener('error', handleError);
          resolve(value);
        };
        const handleLoad = () => finish(true);
        const handleError = () => finish(false);

        image.addEventListener('load', handleLoad, { once: true });
        image.addEventListener('error', handleError, { once: true });

        // Cover the cache race where the image becomes complete between the
        // outer check and listener registration.
        if (image.complete) finish(image.naturalWidth > 0);
      });

      if (!loaded) return false;
    }

    if (image.naturalWidth <= 0) return false;

    try {
      await image.decode();
    } catch {
      // decode() can be interrupted by browser scheduling; naturalWidth is
      // the authoritative fallback.
    }

    return image.complete && image.naturalWidth > 0;
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
    mode: CanvasMode = null,
  ): boolean {
    this.ensureBackground();

    if (!this.videoLayers) {
      Luminous.Logger.warn('Background', 'No video layers for render');
      return false;
    }

    const canvasKey =
      (sourceKey ?? sourceVideo.currentSrc) || sourceVideo.src || null;

    if (mode === 'npv-video') {
      return this.renderDirectVideo(sourceVideo, canvasKey, fallbackImage);
    }

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
      const pendingVideo = this.pendingCanvasVideo;
      this.clearPendingCanvas();
      this.resetVideo(pendingVideo);
    }

    if (this.unsupportedCanvasSources.has(sourceVideo)) {
      return false;
    }

    if (
      !sourceVideo.isConnected ||
      sourceVideo.ended ||
      sourceVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      return false;
    }

    const captureStream = (sourceVideo as CapturableVideo).captureStream;
    if (typeof captureStream !== 'function') {
      this.unsupportedCanvasSources.add(sourceVideo);
      return false;
    }

    let stream: MediaStream;

    try {
      stream = captureStream.call(sourceVideo);
    } catch (error) {
      if (this.isPermanentCanvasError(error)) {
        this.unsupportedCanvasSources.add(sourceVideo);
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
      .then(() => {
        if (!this.isPendingCanvas(renderId, next)) return;

        requestAnimationFrame(() => {
          if (!this.isPendingCanvas(renderId, next)) return;

          this.clearPendingCanvas();
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
          this.unsupportedCanvasSources.add(sourceVideo);
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

  private static renderDirectVideo(
    sourceVideo: HTMLVideoElement,
    sourceKey: string | null,
    fallbackImage?: string | null,
  ): boolean {
    if (
      this.currentType === 'canvas' &&
      this.directVideoSource === sourceVideo &&
      sourceVideo.isConnected &&
      !sourceVideo.ended &&
      sourceVideo.classList.contains('luminous-direct-video-background--active')
    ) {
      // Spotify can reuse the same protected <video> across brief
      // currentSrc/readyState changes; keep it promoted instead of bouncing
      // through the artwork fallback.
      this.directVideoKey = sourceKey;
      this.currentCanvasKey = sourceKey;
      const slot = this.directVideoSlots.get(sourceVideo);
      if (!slot?.isConnected) {
        this.deactivateDirectVideo(true);
        return false;
      }
      this.updateDirectVideoPlaceholder(
        slot,
        fallbackImage ?? sourceVideo.poster,
      );
      return true;
    }

    if (
      !sourceVideo.isConnected ||
      sourceVideo.ended ||
      sourceVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      sourceVideo.videoWidth === 0 ||
      sourceVideo.videoHeight === 0
    ) {
      return false;
    }

    this.cancelVideoCleanup();
    this.imageRenderId++;
    this.videoRenderId++;

    if (this.pendingCanvasVideo) {
      const pendingVideo = this.pendingCanvasVideo;
      this.clearPendingCanvas();
      this.resetVideo(pendingVideo);
    }

    if (this.directVideoSource && this.directVideoSource !== sourceVideo) {
      this.deactivateDirectVideo(true);
    }

    this.cancelDirectVideoCleanup(sourceVideo);

    const host =
      (sourceVideo.closest(
        '#Desktop_PanelContainer_Id',
      ) as HTMLElement | null) ??
      this.directVideoHosts.get(sourceVideo) ??
      null;

    if (!host) {
      Luminous.Logger.warn(
        'Background',
        'Protected video has no NPV panel host',
        sourceVideo,
      );
      return false;
    }

    if (!this.mediaStage || !sourceVideo.parentElement) return false;

    const slot =
      this.directVideoSlots.get(sourceVideo) ??
      this.createDirectVideoPlaceholder(
        sourceVideo,
        fallbackImage ?? sourceVideo.poster,
      );
    if (!slot.isConnected || !host.contains(slot)) return false;
    this.updateDirectVideoPlaceholder(
      slot,
      fallbackImage ?? sourceVideo.poster,
    );
    this.directVideoSlots.set(sourceVideo, slot);
    this.moveDirectVideo(sourceVideo, this.mediaStage);
    sourceVideo.classList.add('luminous-direct-video-background');

    this.directVideoSource = sourceVideo;
    this.directVideoKey = sourceKey;
    this.directVideoHosts.set(sourceVideo, host);
    this.currentCanvasSource = sourceVideo;
    this.currentCanvasKey = sourceKey;

    // Force a layout reflow before the opacity transition starts so the
    // initial opacity:0 state commits and the transition actually runs.
    void sourceVideo.offsetWidth;
    sourceVideo.classList.add('luminous-direct-video-background--active');

    this.transitionTo('canvas', sourceVideo, true);
    Luminous.Logger.info(
      'Background',
      'Using original protected video as background',
      sourceVideo,
    );

    return true;
  }

  private static deactivateDirectVideo(immediate = false) {
    const sourceVideo = this.directVideoSource;
    if (!sourceVideo) return;

    this.directVideoSource = null;
    this.directVideoKey = null;

    sourceVideo.classList.remove('luminous-direct-video-background--active');

    if (immediate) {
      this.restoreDirectVideo(sourceVideo);
      return;
    }

    this.cancelDirectVideoCleanup(sourceVideo);
    const timer = window.setTimeout(() => {
      this.directVideoCleanupTimers.delete(sourceVideo);
      this.restoreDirectVideo(sourceVideo);
    }, this.TRANSITION_MS);
    this.directVideoCleanupTimers.set(sourceVideo, timer);
  }

  private static cancelDirectVideoCleanup(sourceVideo: HTMLVideoElement) {
    const timer = this.directVideoCleanupTimers.get(sourceVideo);
    if (timer === undefined) return;

    window.clearTimeout(timer);
    this.directVideoCleanupTimers.delete(sourceVideo);
  }

  private static restoreDirectVideo(sourceVideo: HTMLVideoElement) {
    this.cancelDirectVideoCleanup(sourceVideo);
    sourceVideo.classList.remove(
      'luminous-direct-video-background',
      'luminous-direct-video-background--active',
    );

    this.directVideoHosts.delete(sourceVideo);

    const slot = this.directVideoSlots.get(sourceVideo);
    this.directVideoSlots.delete(sourceVideo);
    if (slot?.parentElement) {
      // Even a detached Spotify subtree must get its own media node back.
      // Never revive an old player by inserting it into a new panel.
      this.moveDirectVideo(sourceVideo, slot.parentElement, slot);
    } else if (sourceVideo.parentElement === this.mediaStage) {
      sourceVideo.remove();
    }
    if (slot) this.removeDirectVideoPlaceholder(slot);
    slot?.remove();
  }

  /** Discovery must follow the original slot, not the video's new DOM parent. */
  static getDirectVideoSource(): HTMLVideoElement | null {
    const video =
      this.directVideoSource ??
      Array.from(this.directVideoHosts.keys()).find(
        (candidate) =>
          candidate.isConnected &&
          this.directVideoSlots.get(candidate)?.isConnected,
      );
    if (!video?.isConnected) return null;
    const slot = this.directVideoSlots.get(video);
    const host = this.directVideoHosts.get(video);
    if (slot) this.directVideoPlaceholders.get(slot)?.sync();
    return slot?.isConnected && host?.contains(slot) ? video : null;
  }

  private static moveDirectVideo(
    video: HTMLVideoElement,
    parent: HTMLElement,
    before: Node | null = null,
  ) {
    // Chromium's state-preserving move avoids restarting an EME player where
    // available. Older Spotify clients retain the same media element/keys.
    const target = parent as HTMLElement & {
      moveBefore?: (node: Node, child: Node | null) => void;
    };
    if (target.moveBefore && parent.isConnected && video.isConnected) {
      target.moveBefore(video, before);
    } else {
      parent.insertBefore(video, before);
    }
  }

  private static createDirectVideoPlaceholder(
    video: HTMLVideoElement,
    artwork?: string | null,
  ): HTMLDivElement {
    const rect = video.getBoundingClientRect();
    const host = video.closest('#Desktop_PanelContainer_Id');
    const parent = video.parentElement!;
    let frame = parent;

    // A player can nest an absolutely positioned video in a zero-size wrapper.
    // A normal-flow sibling in that wrapper is clipped or has no usable width.
    // Find the actual media-sized frame, never the entire NPV panel.
    for (
      let candidate: HTMLElement | null = parent;
      candidate && candidate !== host;
      candidate = candidate.parentElement
    ) {
      const bounds = candidate.getBoundingClientRect();
      const matchesVideo =
        Math.abs(bounds.width - rect.width) <= 4 &&
        (bounds.height === 0 || Math.abs(bounds.height - rect.height) <= 4);
      // The sidebar may have resized while Spotify still reports the previous
      // intrinsic player layout. Accept a slightly larger media frame too.
      const containsVideo =
        rect.width > 0 &&
        rect.height > 0 &&
        bounds.width >= rect.width - 4 &&
        bounds.width <= rect.width * 1.5 &&
        bounds.height <= rect.height * 1.5 &&
        Math.abs(bounds.left - rect.left) <= 4 &&
        Math.abs(bounds.top - rect.top) <= 4;
      if (bounds.width > 0 && (matchesVideo || containsVideo)) {
        frame = candidate;
        break;
      }
    }

    // Keep restoration/discovery anchored to the original parent, independent
    // of where the visible placeholder needs to be mounted.
    const slot = document.createElement('div');
    slot.className = 'luminous-direct-video-anchor';
    slot.hidden = true;
    video.before(slot);

    const placeholder = document.createElement('div');
    placeholder.className = 'luminous-direct-video-placeholder';
    placeholder.setAttribute('role', 'img');
    placeholder.setAttribute(
      'aria-label',
      'Music video is playing in the background',
    );
    // Like the main media renderer, keep essential presentation inline. The
    // placeholder must still work if a client has an older cached user.css.
    Object.assign(placeholder.style, {
      position: 'fixed',
      display: 'block',
      overflow: 'hidden',
      background: 'var(--spice-sidebar, #181818)',
      borderRadius: '8px',
      pointerEvents: 'none',
      isolation: 'isolate',
      zIndex: '100',
    });
    const image = document.createElement('img');
    image.className = 'luminous-direct-video-placeholder-artwork';
    image.alt = '';
    image.decoding = 'async';
    Object.assign(image.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      maxWidth: 'none',
      maxHeight: 'none',
    });
    image.addEventListener('error', () => {
      image.style.visibility = 'hidden';
    });
    image.addEventListener('load', () => {
      image.style.visibility = 'visible';
    });
    const shade = document.createElement('span');
    Object.assign(shade.style, {
      position: 'absolute',
      inset: '0',
      background:
        'linear-gradient(180deg, rgba(8,10,14,.08), rgba(8,10,14,.6))',
    });
    const badge = document.createElement('span');
    badge.className = 'luminous-direct-video-placeholder-label';
    badge.textContent = 'Video in background';
    Object.assign(badge.style, {
      position: 'absolute',
      left: '12px',
      bottom: '12px',
      maxWidth: 'calc(100% - 24px)',
      padding: '6px 10px',
      border: '1px solid rgba(255,255,255,.16)',
      borderRadius: '999px',
      background: 'rgba(0,0,0,.55)',
      color: '#fff',
      fontSize: '12px',
      lineHeight: '1.4',
    });
    placeholder.append(image, shade, badge);

    const styles = new Map<string, { value: string; priority: string }>();
    const override = (property: string, value: string) => {
      if (!styles.has(property)) {
        styles.set(property, {
          value: frame.style.getPropertyValue(property),
          priority: frame.style.getPropertyPriority(property),
        });
      }
      frame.style.setProperty(property, value, 'important');
    };
    const ratio =
      rect.width > 0 && rect.height > 0
        ? rect.width / rect.height
        : video.videoWidth / video.videoHeight || 16 / 9;
    const reserveHeight = () => {
      const width = frame.getBoundingClientRect().width || rect.width;
      const computed = getComputedStyle(frame);
      const verticalInsets =
        computed.boxSizing === 'border-box'
          ? 0
          : (parseFloat(computed.paddingTop) || 0) +
            (parseFloat(computed.paddingBottom) || 0) +
            (parseFloat(computed.borderTopWidth) || 0) +
            (parseFloat(computed.borderBottomWidth) || 0);
      const height = `${Math.max(0, width / ratio - verticalInsets)}px`;
      if (frame.style.getPropertyValue('min-height') !== height) {
        override('min-height', height);
      }
    };
    reserveHeight();
    const initialFrame = frame.getBoundingClientRect();
    const panel = host as HTMLElement;
    const initialPanel = panel.getBoundingClientRect();
    const origin = initialFrame.width > 0 ? frame : panel;
    const initialOrigin = origin === frame ? initialFrame : initialPanel;
    const mediaWidth = rect.width || initialOrigin.width;
    const mediaHeight = rect.height || mediaWidth / ratio;
    const offsetX = rect.width > 0 ? rect.left - initialOrigin.left : 0;
    const offsetY = rect.height > 0 ? rect.top - initialOrigin.top : 0;
    let scheduled: number | null = null;
    const place = () => {
      scheduled = null;
      if (
        !slot.isConnected ||
        !panel.contains(slot) ||
        panel.getClientRects().length === 0 ||
        panel.getBoundingClientRect().width <= 0 ||
        getComputedStyle(panel).visibility === 'hidden'
      ) {
        placeholder.style.display = 'none';
        return;
      }
      reserveHeight();
      const bounds = origin.getBoundingClientRect();
      const scale =
        bounds.width > 0 && initialOrigin.width > 0
          ? bounds.width / initialOrigin.width
          : 1;
      const left = bounds.left + offsetX * scale;
      const top = bounds.top + offsetY * scale;
      const width = mediaWidth * scale;
      const height = mediaHeight * scale;
      let clipLeft = Math.max(0, left);
      let clipTop = Math.max(0, top);
      let clipRight = Math.min(window.innerWidth, left + width);
      let clipBottom = Math.min(window.innerHeight, top + height);
      // Paint outside Spotify's stacking contexts, but remain clipped to the
      // actual panel/scrollports and below its sticky NPV title.
      for (
        let ancestor: HTMLElement | null = frame;
        ancestor && ancestor !== document.body;
        ancestor = ancestor.parentElement
      ) {
        const box = ancestor.getBoundingClientRect();
        if (box.width <= 0 || box.height <= 0) continue;
        const style = getComputedStyle(ancestor);
        if (
          ancestor === panel ||
          /(auto|scroll|hidden|clip)/.test(style.overflowX)
        ) {
          clipLeft = Math.max(clipLeft, box.left);
          clipRight = Math.min(clipRight, box.right);
        }
        if (
          ancestor === panel ||
          /(auto|scroll|hidden|clip)/.test(style.overflowY)
        ) {
          clipTop = Math.max(clipTop, box.top);
          clipBottom = Math.min(clipBottom, box.bottom);
        }
      }
      const header = panel.querySelector('.main-nowPlayingView-headerWrapper');
      if (header)
        clipTop = Math.max(clipTop, header.getBoundingClientRect().bottom);
      placeholder.style.display =
        clipRight > clipLeft && clipBottom > clipTop ? 'block' : 'none';
      Object.assign(placeholder.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        clipPath: `inset(${Math.max(0, clipTop - top)}px ${Math.max(0, left + width - clipRight)}px ${Math.max(0, top + height - clipBottom)}px ${Math.max(0, clipLeft - left)}px)`,
      });
    };
    const sync = () => {
      if (scheduled === null) scheduled = requestAnimationFrame(place);
    };
    const observer = new ResizeObserver(sync);
    observer.observe(frame);
    if (panel !== frame) observer.observe(panel);
    window.addEventListener('resize', sync, { passive: true });
    document.addEventListener('scroll', sync, { capture: true, passive: true });
    // A body-level overlay cannot be hidden underneath Spotify's opaque
    // video shells, pseudo-elements, or a clipped/zero-size React wrapper.
    document.body.append(placeholder);
    this.directVideoPlaceholders.set(slot, {
      element: placeholder,
      frame,
      observer,
      styles,
      sync,
      dispose: () => {
        if (scheduled !== null) cancelAnimationFrame(scheduled);
        window.removeEventListener('resize', sync);
        document.removeEventListener('scroll', sync, true);
      },
    });
    place();
    this.updateDirectVideoPlaceholder(slot, artwork);
    return slot;
  }

  private static updateDirectVideoPlaceholder(
    slot: HTMLDivElement,
    artwork?: string | null,
  ) {
    const placeholder = this.directVideoPlaceholders.get(slot)?.element;
    const image = placeholder?.querySelector('img');
    if (!image) return;
    const source = artwork?.trim();
    if (source) {
      if (image.getAttribute('src') !== source) image.src = source;
    } else {
      image.removeAttribute('src');
      image.style.visibility = 'hidden';
    }
    this.directVideoPlaceholders.get(slot)?.sync();
  }

  private static removeDirectVideoPlaceholder(slot: HTMLDivElement) {
    const state = this.directVideoPlaceholders.get(slot);
    if (!state) return;
    state.observer.disconnect();
    state.dispose();
    state.element.remove();
    state.styles.forEach(({ value, priority }, property) => {
      if (value) state.frame.style.setProperty(property, value, priority);
      else state.frame.style.removeProperty(property);
    });
    this.directVideoPlaceholders.delete(slot);
  }

  private static restoreAllDirectVideos() {
    this.directVideoCleanupTimers.forEach((timer) =>
      window.clearTimeout(timer),
    );
    this.directVideoCleanupTimers.clear();
    Array.from(this.directVideoHosts.keys()).forEach((video) =>
      this.restoreDirectVideo(video),
    );
    this.directVideoSource = null;
    this.directVideoKey = null;
  }

  static destroy() {
    this.imageRenderId++;
    this.videoRenderId++;
    this.currentCanvasSource = null;
    this.currentCanvasKey = null;
    this.clearPendingCanvas();
    this.restoreAllDirectVideos();

    this.cancelVideoCleanup();
    this.videoLayers?.forEach((video) => this.resetVideo(video));
    this.root?.remove();

    this.root = null;
    this.base = null;
    this.mediaStage = null;
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
    this.clearPendingCanvas();
    this.transitionTo('none');
  }

  private static transitionTo(
    type: BackgroundType,
    activeElement: BackgroundElement | null = null,
    force = false,
  ) {
    if (!this.imageLayers || !this.videoLayers) return;

    if (!force && this.currentType === type && this.get() === activeElement)
      return;

    if (
      this.directVideoSource &&
      (type !== 'canvas' || activeElement !== this.directVideoSource)
    ) {
      this.deactivateDirectVideo();
    }

    // Commit the buffer index only after comparing the incoming element with
    // the previously visible one. Committing earlier makes `get()` report the
    // incoming buffer as active and turns same-type transitions into no-ops.
    if (type === 'image' && activeElement instanceof HTMLImageElement) {
      const imageIndex = this.imageLayers.indexOf(activeElement);
      if (imageIndex !== -1) this.activeImage = imageIndex;
    } else if (
      type === 'canvas' &&
      activeElement instanceof HTMLVideoElement &&
      activeElement !== this.directVideoSource
    ) {
      const videoIndex = this.videoLayers.indexOf(activeElement);
      if (videoIndex !== -1) this.activeVideo = videoIndex;
    }

    this.currentType = type;

    if (this.base) {
      this.base.style.opacity = type === 'none' ? '1' : '0';
    }

    this.imageLayers.forEach((element) => {
      const active = type === 'image' && element === activeElement;
      element.style.opacity = active ? '1' : '0';
    });

    this.videoLayers.forEach((element) => {
      const active = type === 'canvas' && element === activeElement;
      element.style.opacity = active ? '1' : '0';
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

  private static scheduleVideoCleanup() {
    this.cancelVideoCleanup();

    this.videoCleanupTimer = window.setTimeout(() => {
      this.videoCleanupTimer = null;

      const activeVideo =
        this.currentType === 'canvas' &&
        !this.directVideoSource &&
        this.videoLayers
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
