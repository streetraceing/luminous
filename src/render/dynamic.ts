import { CanvasPayload } from "../api/canvas";
import { SongPayload } from "../api/song";

export class DynamicBackground {
  private static currentSong: SongPayload | null = null;
  private static currentCanvas: HTMLVideoElement | null = null;

  static init() {
    Luminous.Song.addEventListener("ready", this.handleSong);
    Luminous.Song.addEventListener("change", this.handleSong);

    Luminous.Canvas.addEventListener("mount", this.handleCanvas);
    Luminous.Canvas.addEventListener("change", this.handleCanvas);
    Luminous.Canvas.addEventListener("unmount", this.handleCanvasUnmount);
  }

  static render() {
    if (Luminous.Settings.get("dynamicBackground") === false) return;

    if (this.currentCanvas && !document.hidden) {
      Luminous.Background.render({ canvas: this.currentCanvas });
      return;
    }

    if (this.currentSong?.image) {
      Luminous.Background.render({ image: this.currentSong.image });
      return;
    }

    Luminous.Background.render();
  }

  private static handleSong = (song: SongPayload) => {
    this.currentSong = song;
    this.render();
  };

  private static handleCanvas = (canvas: CanvasPayload) => {
    if (!canvas.video) return;

    this.currentCanvas = canvas.video;
    this.render();
  };

  private static handleCanvasUnmount = () => {
    if (this.currentSong?.track.metadata["canvas.id"] !== undefined) {
      return;
    }

    this.currentCanvas = null;
    this.render();
  };
}

export class CinemaObserver {
  private static observer: MutationObserver | null = null;

  static init() {
    if (this.observer) return;

    const html = document.documentElement;

    this.observer = new MutationObserver(() => {
      html.removeAttribute("data-transition");

      [
        "data-right-sidebar-open-preenter",
        // "data-right-sidebar-open-duringenter",
        // "data-right-sidebar-open-postenter",
        "data-right-sidebar-open-preexit",
        "data-right-sidebar-open-duringexit",
        "data-right-sidebar-open-postexit",
      ].forEach((attr) => html.removeAttribute(attr));
    });

    this.observer.observe(html, { attributes: true });
  }

  static destroy() {
    this.observer?.disconnect();
    this.observer = null;
  }
}

type PlaylistBackgroundSyncOptions = {
  onBackgroundChange?: (
    bg: string,
    source: HTMLElement,
    target: HTMLElement,
  ) => void;
};

type SyncController = {
  disconnect(): void;
};

export class Synchronize {
  static playlistBackground(
    options?: PlaylistBackgroundSyncOptions,
  ): SyncController {
    let root: HTMLElement | null = null;
    let observer: MutationObserver | null = null;
    let rafId: number | null = null;
    let lastBg: string | null = null;
    let lastTarget: HTMLElement | null = null;

    function scheduleSync() {
      if (rafId !== null) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;
        sync();
      });
    }

    function sync() {
      if (!root) return;

      const source = root.querySelector(
        ".before-scroll-node > div > :first-child",
      ) as HTMLElement | null;

      const target = root.querySelector(
        "section > .main-entityHeader-container, section > div > .main-entityHeader-container",
      ) as HTMLElement | null;

      if (!source || !target) return;

      const bg = getComputedStyle(source).backgroundImage;
      if (!bg || bg === "none") return;

      const sameBg = bg === lastBg;
      const sameTarget = target === lastTarget;

      if (sameBg && sameTarget) return;

      lastBg = bg;
      lastTarget = target;

      target.style.backgroundImage = bg;
      target.style.backgroundSize = "cover";
      target.style.backgroundPosition = "center";
      target.style.backgroundRepeat = "no-repeat";

      options?.onBackgroundChange?.(bg, source, target);
    }

    function attach() {
      root = document.querySelector(
        ".main-view-container",
      ) as HTMLElement | null;

      if (!root) {
        requestAnimationFrame(attach);
        return;
      }

      observer = new MutationObserver(scheduleSync);

      observer.observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["style", "class"],
      });

      sync();
    }

    attach();

    return {
      disconnect() {
        observer?.disconnect();
        observer = null;

        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }

        root = null;
        lastBg = null;
        lastTarget = null;
      },
    };
  }
}
