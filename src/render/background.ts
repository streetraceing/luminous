export type BackgroundType = "none" | "image" | "canvas";

export type BackgroundEvent = "change";

export type BackgroundPayload = {
  type: BackgroundType;
  element: HTMLVideoElement | HTMLImageElement | null;
};

export type BackgroundListener = (payload: BackgroundPayload) => void;

export class Background {
  private static root: HTMLDivElement | null = null;
  private static base: HTMLDivElement | null = null;

  private static imageLayers: [HTMLImageElement, HTMLImageElement] | null =
    null;
  private static activeImage = 0;

  private static videoLayers: [HTMLVideoElement, HTMLVideoElement] | null =
    null;
  private static activeVideo = 0;

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
      transition: "opacity 0.5s ease-in-out",
      opacity: "0",
      willChange: "opacity, transform",
    };
  }

  private static createImageLayer(): HTMLImageElement {
    const img = document.createElement("img");
    Object.assign(img.style, this.baseStyle());
    return img;
  }

  private static createVideoLayer(): HTMLVideoElement {
    const video = document.createElement("video");
    Object.assign(video.style, this.baseStyle());

    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.loop = true;

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
      transition: "opacity 0.5s ease",
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

    if (!options || (!options.image && !options.canvas)) {
      this.clear();
      return;
    }

    if (options.canvas) {
      this.renderCanvas(options.canvas);
      return;
    }

    if (options.image) {
      this.renderImage(options.image);
      return;
    }

    this.clear();
  }

  private static renderImage(src: string | null) {
    this.ensureBackground();
    if (!this.imageLayers) return;

    if (!src) {
      this.switchTo("none");
      return;
    }

    const nextIndex = this.activeImage === 0 ? 1 : 0;
    const current = this.imageLayers[this.activeImage];
    const next = this.imageLayers[nextIndex];

    if (current.src === src) {
      current.style.opacity = "1";
      next.style.opacity = "0";
      this.switchTo("image");
      return;
    }

    const preload = new Image();
    preload.src = src;

    preload.onload = () => {
      next.src = src;

      requestAnimationFrame(() => {
        next.style.opacity = "1";
        current.style.opacity = "0";
        this.activeImage = nextIndex;
      });
    };

    this.switchTo("image");
  }

  private static renderCanvas(sourceVideo: HTMLVideoElement) {
    this.ensureBackground();
    if (!this.videoLayers) return;

    const stream = (sourceVideo as any).captureStream?.();
    if (!stream) return;

    const nextIndex = this.activeVideo === 0 ? 1 : 0;
    const current = this.videoLayers[this.activeVideo];
    const next = this.videoLayers[nextIndex];

    next.style.opacity = "0";
    next.srcObject = stream;

    next.onplaying = () => {
      next.onplaying = null;

      requestAnimationFrame(() => {
        next.style.opacity = "1";
        current.style.opacity = "0";
        this.activeVideo = nextIndex;
      });
    };

    next.play().catch(() => {});

    this.switchTo("canvas");
  }

  private static clear() {
    this.switchTo("none");
  }

  private static switchTo(type: BackgroundType) {
    if (!this.imageLayers || !this.videoLayers) return;

    this.currentType = type;

    if (type === "none") {
      this.base && (this.base.style.opacity = "1");

      this.imageLayers.forEach((el) => (el.style.opacity = "0"));
      this.videoLayers.forEach((el) => (el.style.opacity = "0"));
    }

    if (type === "image") {
      this.base && (this.base.style.opacity = "0");

      this.videoLayers.forEach((el) => (el.style.opacity = "0"));
    }

    if (type === "canvas") {
      this.base && (this.base.style.opacity = "0");

      this.imageLayers.forEach((el) => (el.style.opacity = "0"));
    }

    this.emit("change");
  }
}
