import {
  PlaylistBackgroundSyncOptions,
  SyncController,
  HomeHeaderHeightSyncOptions,
} from "../../types/runtime/dynamic.types";
import { Logger } from "../api/logger";

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
  static homeHeaderHeight(
    options?: HomeHeaderHeightSyncOptions,
  ): SyncController {
    let root: HTMLElement | null = null;
    let observer: MutationObserver | null = null;
    let rafId: number | null = null;

    let lastHeight: number | null = null;

    function outerHeight(el: HTMLElement): number {
      const style = getComputedStyle(el);

      return (
        el.offsetHeight +
        parseFloat(style.marginTop) +
        parseFloat(style.marginBottom)
      );
    }

    function scheduleSync() {
      if (rafId !== null) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;
        sync();
      });
    }

    function sync() {
      if (!root) return;

      const header = root.querySelector(
        ".main-home-homeHeader",
      ) as HTMLElement | null;
      const chips = root.querySelector(
        ".main-home-filterChipsContainer",
      ) as HTMLElement | null;
      const firstSection = root.querySelector(
        'section[data-testid="home-page"]:has(.view-homeShortcutsGrid-shortcuts) .main-home-content section:first-child',
      ) as HTMLElement | null;

      if (!header || !chips || !firstSection) return;

      const height = outerHeight(chips) + outerHeight(firstSection);

      if (height === lastHeight) return;

      lastHeight = height;

      header.style.height = `${height}px`;

      options?.onHeightChange?.(height, chips, firstSection, header);
    }

    function attach() {
      root = document.querySelector("#main-view") as HTMLElement | null;

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
        lastHeight = null;
      },
    };
  }
  static brokenUiWatcher(): SyncController {
    let observer: MutationObserver | null = null;
    let rafId: number | null = null;
    let intervalId: number | null = null;

    let brokenSince: number | null = null;
    let recovered = false;

    const BROKEN_TIMEOUT = 4000;
    const CHECK_INTERVAL = 1000;

    function hasSpotifyUi(): boolean {
      return !!(
        document.querySelector(".Root__main-view") ||
        document.querySelector(".main-view-container") ||
        document.querySelector('[data-testid="main-view"]')
      );
    }

    function scheduleCheck() {
      if (rafId !== null) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;
        check();
      });
    }

    function startPolling() {
      if (intervalId !== null) return;

      intervalId = window.setInterval(check, CHECK_INTERVAL);
    }

    function stopPolling() {
      if (intervalId === null) return;

      clearInterval(intervalId);
      intervalId = null;
    }

    function check() {
      const main = document.querySelector("#main");

      if (!main) return;

      const uiMounted = hasSpotifyUi();

      // UI recovered
      if (uiMounted) {
        brokenSince = null;
        recovered = false;

        stopPolling();

        return;
      }

      // first broken detection
      if (brokenSince === null) {
        brokenSince = Date.now();

        Logger.log("INFO", "Main", "Waiting for Spotify UI mount...");

        startPolling();

        return;
      }

      const brokenTime = Date.now() - brokenSince;

      if (brokenTime < BROKEN_TIMEOUT) {
        return;
      }

      if (recovered) {
        return;
      }

      recovered = true;

      Logger.log("WARN", "Main", "Spotify UI appears broken, reloading...");

      window.location.reload();
    }

    function attach() {
      observer = new MutationObserver(scheduleCheck);

      observer.observe(document.body, {
        subtree: true,
        childList: true,
      });

      scheduleCheck();
    }

    attach();

    return {
      disconnect() {
        observer?.disconnect();
        observer = null;

        stopPolling();

        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }

        brokenSince = null;
        recovered = false;
      },
    };
  }
  static observeCinema(): SyncController {
    let observer: MutationObserver | null = null;

    function cleanupAttributes() {
      const html = document.documentElement;

      html.removeAttribute("data-transition");

      [
        "data-right-sidebar-open-preenter",
        // "data-right-sidebar-open-duringenter",
        // "data-right-sidebar-open-postenter",
        "data-right-sidebar-open-preexit",
        "data-right-sidebar-open-duringexit",
        "data-right-sidebar-open-postexit",
      ].forEach((attr) => {
        html.removeAttribute(attr);
      });
    }

    function attach() {
      const html = document.documentElement;

      observer = new MutationObserver(() => {
        cleanupAttributes();
      });

      observer.observe(html, {
        attributes: true,
        attributeFilter: [
          "data-transition",

          "data-right-sidebar-open-preenter",
          "data-right-sidebar-open-duringenter",
          "data-right-sidebar-open-postenter",

          "data-right-sidebar-open-preexit",
          "data-right-sidebar-open-duringexit",
          "data-right-sidebar-open-postexit",
        ],
      });

      cleanupAttributes();
    }

    attach();

    return {
      disconnect() {
        observer?.disconnect();
        observer = null;
      },
    };
  }
}
