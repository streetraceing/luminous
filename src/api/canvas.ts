export type CanvasEvent = "mount" | "unmount" | "change";

export type CanvasPayload = {
  video: HTMLVideoElement | null;
  mode: CanvasMode;
};

export type CanvasListener = (payload: CanvasPayload) => void;

export type CanvasMode = "npv" | "cinema" | null;

export class Canvas {
  private static listeners = new Map<CanvasEvent, Set<CanvasListener>>();
  private static observer: MutationObserver | null = null;

  private static currentVideo: HTMLVideoElement | null = null;
  private static currentMode: CanvasMode = null;

  private static initialized = false;

  static addEventListener(event: CanvasEvent, listener: CanvasListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(listener);

    if (!this.initialized) {
      this.init();
    }
  }

  static removeEventListener(event: CanvasEvent, listener: CanvasListener) {
    this.listeners.get(event)?.delete(listener);
  }

  static get(): CanvasPayload {
    return {
      video: this.currentVideo,
      mode: this.currentMode,
    };
  }

  static getVideo() {
    return this.currentVideo;
  }

  static init() {
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
        ".Root__top-container",
      ) as HTMLElement | null;

      if (existing) {
        resolve(existing);
        return;
      }

      const obs = new MutationObserver(() => {
        const el = document.querySelector(
          ".Root__top-container",
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

  private static detect(): {
    video: HTMLVideoElement | null;
    mode: CanvasMode;
  } {
    const npv = document.querySelector(
      ".canvasVideoContainerNPV video",
    ) as HTMLVideoElement | null;

    if (npv) {
      return { video: npv, mode: "npv" };
    }

    const cinema = document.querySelector(
      ".Root__top-container:has(#VideoPlayerCinema_ReactPortal) video",
    ) as HTMLVideoElement | null;

    if (cinema) {
      return { video: cinema, mode: "cinema" };
    }

    return { video: null, mode: null };
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

      this.emit("unmount", {
        video: null,
        mode: prevMode,
      });

      return;
    }

    if (!prevVideo && video) {
      this.currentVideo = video;
      this.currentMode = mode;

      this.emit("mount", {
        video,
        mode,
      });

      return;
    }

    if (videoChanged || modeChanged) {
      this.currentVideo = video;
      this.currentMode = mode;

      this.emit("change", {
        video,
        mode,
      });
    }
  }

  private static emit(event: CanvasEvent, payload: CanvasPayload) {
    this.listeners.get(event)?.forEach((listener) => {
      listener(payload);
    });
  }
}
