export type BackgroundType = "none" | "image" | "canvas";

export type BackgroundEvent = "change";

export type BackgroundPayload = {
  type: BackgroundType;
  element: HTMLVideoElement | HTMLImageElement | null;
};

export type BackgroundListener = (payload: BackgroundPayload) => void;

type BackgroundElement = HTMLVideoElement | HTMLImageElement;

export class Background {
  private static readonly TRANSITION_MS = 250;

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

  private static currentType: BackgroundType = "none";

  private static listeners = new Map<
    BackgroundEvent,
    Set<BackgroundListener>
  >();

  static getType(): BackgroundType {
    return this.currentType;
  }

  static get(): HTMLVideoElement | HTMLImageElement | null {
    if (this.currentType === "canvas" && this.videoLayers) {
      return this.videoLayers[this.activeVideo];
    }

    if (this.currentType === "image" && this.imageLayers) {
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

    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }

  private static baseStyle(): Partial<CSSStyleDeclaration> {
    return {
      position: "absolute",
      inset: "0",
      width: "120%",
      height: "120%",
      objectFit: "cover",
      filter: `blur(var(--luminous-background-blur)) brightness(var(--luminous-background-brightness))`,
      transform: "scale(1.2) translateZ(0)",
      pointerEvents: "none",
      transition: `opacity ${this.TRANSITION_MS}ms linear`,
      opacity: "0",
      willChange: "opacity, transform",
    };
  }

  private static createImageLayer(): HTMLImageElement {
    const img = document.createElement("img");
    Object.assign(img.style, this.baseStyle());

    Luminous.Logger.info("Background", "Created image layer", img);

    return img;
  }

  private static createVideoLayer(): HTMLVideoElement {
    const video = document.createElement("video");
    Object.assign(video.style, this.baseStyle());

    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.loop = true;

    Luminous.Logger.info("Background", "Created video layer", video);

    return video;
  }

  private static ensureBackground() {
    if (this.root) return;

    this.root = document.createElement("div");
    this.root.id = "luminous-dynamic-background";

    Object.assign(this.root.style, {
      position: "fixed",
      inset: "0",
      zIndex: "0",
      overflow: "hidden",
      pointerEvents: "none",
    });

    this.base = document.createElement("div");
    this.base.className = "luminous-base";

    Object.assign(this.base.style, {
      position: "absolute",
      inset: "0",
      background: "var(--spice-sidebar)",
      transition: `opacity ${this.TRANSITION_MS}ms linear`,
      opacity: "1",
    });

    this.root.appendChild(this.base);

    document.body.prepend(this.root);

    const imgA = this.createImageLayer();
    const imgB = this.createImageLayer();
    this.root.append(imgA, imgB);
    this.imageLayers = [imgA, imgB];

    const vidA = this.createVideoLayer();
    const vidB = this.createVideoLayer();
    this.root.append(vidA, vidB);
    this.videoLayers = [vidA, vidB];
  }

  static render(options?: {
    image?: string | null;
    canvas?: HTMLVideoElement | null;
  }) {
    this.ensureBackground();

    const logDefaultLayer = () =>
      Luminous.Logger.info("Background", "Rendering default layer");

    if (!options || (!options.image && !options.canvas)) {
      this.clear();
      logDefaultLayer();

      return;
    }

    if (options.canvas) {
      this.renderCanvas(options.canvas);
      Luminous.Logger.info(
        "Background",
        "Rendering canvas layer",
        options.canvas,
      );

      return;
    }

    if (options.image) {
      this.renderImage(options.image);
      Luminous.Logger.info(
        "Background",
        "Rendering image layer",
        options.image,
      );

      return;
    }

    this.clear();
    logDefaultLayer();
  }

  static preloadImage(src: string | null | undefined) {
    if (!src || this.preloadedImages.has(src)) return;

    const image = new Image();
    image.src = src;
    this.preloadedImages.set(src, image);
  }

  private static renderImage(src: string | null) {
    this.ensureBackground();
    if (!this.imageLayers) {
      Luminous.Logger.warn("Background", "No image layers for render");
      return;
    }

    if (!src) {
      Luminous.Logger.warn("Background", "No image src for render");
      this.transitionTo("none");

      return;
    }

    const renderId = ++this.imageRenderId;
    const nextIndex = this.activeImage === 0 ? 1 : 0;
    const current = this.imageLayers[this.activeImage];
    const next = this.imageLayers[nextIndex];

    if (current.src === src) {
      this.transitionTo("image", current);
      return;
    }

    const preload = this.getPreloadedImage(src);

    const showImage = () => {
      if (renderId !== this.imageRenderId) return;

      next.src = src;

      requestAnimationFrame(() => {
        if (renderId !== this.imageRenderId) return;

        this.activeImage = nextIndex;
        this.transitionTo("image", next);
      });
    };

    if (preload.complete && preload.naturalWidth > 0) {
      showImage();
      return;
    }

    preload.onload = showImage;

    preload.onerror = () => {
      if (renderId !== this.imageRenderId) return;

      Luminous.Logger.warn("Background", "Failed to load image", src);

      if (!current.src) {
        this.transitionTo("none");
      }
    };

    if (!preload.src) {
      preload.src = src;
    }
  }

  private static getPreloadedImage(src: string): HTMLImageElement {
    let image = this.preloadedImages.get(src);

    if (!image) {
      image = new Image();
      image.src = src;
      this.preloadedImages.set(src, image);
    }

    return image;
  }

  private static renderCanvas(sourceVideo: HTMLVideoElement) {
    this.ensureBackground();
    if (!this.videoLayers) {
      Luminous.Logger.warn("Background", "No video layers for render");
      return;
    }

    const stream = (sourceVideo as any).captureStream?.();
    if (!stream) {
      Luminous.Logger.warn("Background", "No canvas stream for render");
      return;
    }

    const nextIndex = this.activeVideo === 0 ? 1 : 0;
    const next = this.videoLayers[nextIndex];
    const renderId = ++this.videoRenderId;

    next.style.opacity = "0";
    next.srcObject = stream;

    next.onplaying = () => {
      if (renderId !== this.videoRenderId) return;

      next.onplaying = null;

      requestAnimationFrame(() => {
        if (renderId !== this.videoRenderId) return;

        this.activeVideo = nextIndex;
        this.transitionTo("canvas", next);
      });
    };

    next.play().catch(() => {});
  }

  private static clear() {
    this.imageRenderId++;
    this.videoRenderId++;

    if (this.videoLayers) {
      this.videoLayers.forEach((el) => {
        this.resetVideo(el);
      });
    }

    this.transitionTo("none");
  }

  private static transitionTo(
    type: BackgroundType,
    activeElement: BackgroundElement | null = null,
  ) {
    if (!this.imageLayers || !this.videoLayers) return;

    this.currentType = type;

    this.base && (this.base.style.opacity = type === "none" ? "1" : "0");

    this.imageLayers.forEach((el) => {
      el.style.opacity = type === "image" && el === activeElement ? "1" : "0";
    });

    this.videoLayers.forEach((el) => {
      el.style.opacity = type === "canvas" && el === activeElement ? "1" : "0";
    });

    this.emit("change");
  }

  private static resetVideo(video: HTMLVideoElement) {
    video.pause();
    video.srcObject = null;
    video.removeAttribute("src");
    video.load();
  }
}
