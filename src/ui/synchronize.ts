import {
  PlaylistBackgroundSyncOptions,
  SyncController,
  HomeHeaderHeightSyncOptions,
} from '../types/runtime/dynamic.types';
import { Logger } from '../api/logger';
import { setUiHealth } from './health';

const PLAYLIST_BACKGROUND_CLASS = 'luminous-playlist-background';
const PLAYLIST_BACKGROUND_VAR = '--luminous-playlist-background-image';
const HOME_HEADER_HEIGHT_CLASS = 'luminous-home-header-height';
const HOME_HEADER_HEIGHT_VAR = '--luminous-home-header-height';

export class Synchronize {
  static playlistBackground(
    options?: PlaylistBackgroundSyncOptions,
  ): SyncController {
    let root: HTMLElement | null = null;
    let rootObserver: MutationObserver | null = null;
    let contentObserver: MutationObserver | null = null;
    let rafId: number | null = null;
    let disposed = false;
    let lastBackground: string | null = null;
    let lastTarget: HTMLElement | null = null;

    function cleanupTarget() {
      if (!lastTarget) return;

      lastTarget.classList.remove(PLAYLIST_BACKGROUND_CLASS);
      lastTarget.style.removeProperty(PLAYLIST_BACKGROUND_VAR);
      lastTarget = null;
      lastBackground = null;
    }

    function attachRoot() {
      if (disposed) return;

      const nextRoot = document.querySelector(
        '.main-view-container',
      ) as HTMLElement | null;

      if (nextRoot === root && root?.isConnected) return;

      contentObserver?.disconnect();
      contentObserver = null;
      cleanupTarget();
      root = nextRoot;

      if (!root) return;

      contentObserver = new MutationObserver(scheduleSync);
      contentObserver.observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }

    function scheduleSync() {
      if (disposed || rafId !== null) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;
        attachRoot();
        sync();
      });
    }

    function sync() {
      if (!root) return;

      const source = root.querySelector(
        '.before-scroll-node > div > :first-child',
      ) as HTMLElement | null;

      const target =
        (root.querySelector(
          'section > .main-entityHeader-container, section > div > .main-entityHeader-container',
        ) as HTMLElement | null) ||
        (root.querySelector(
          'main > div > .main-entityHeader-container',
        ) as HTMLElement | null);

      if (!source || !target) {
        cleanupTarget();
        return;
      }

      const background = getComputedStyle(source).backgroundImage;
      if (!background || background === 'none') {
        cleanupTarget();
        return;
      }

      if (target !== lastTarget) {
        cleanupTarget();
        lastTarget = target;
      }

      if (background === lastBackground) return;

      lastBackground = background;
      target.classList.add(PLAYLIST_BACKGROUND_CLASS);
      target.style.setProperty(PLAYLIST_BACKGROUND_VAR, background);
      options?.onBackgroundChange?.(background, source, target);
    }

    rootObserver = new MutationObserver(scheduleSync);
    rootObserver.observe(document.documentElement, {
      subtree: true,
      childList: true,
    });
    scheduleSync();

    return {
      disconnect() {
        disposed = true;
        rootObserver?.disconnect();
        contentObserver?.disconnect();
        rootObserver = null;
        contentObserver = null;

        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }

        cleanupTarget();
        root = null;
      },
    };
  }

  static homeHeaderHeight(
    options?: HomeHeaderHeightSyncOptions,
  ): SyncController {
    let root: HTMLElement | null = null;
    let rootObserver: MutationObserver | null = null;
    let contentObserver: MutationObserver | null = null;
    let rafId: number | null = null;
    let disposed = false;
    let lastHeight: number | null = null;
    let lastHeader: HTMLElement | null = null;

    function cleanupHeader() {
      if (!lastHeader) return;

      lastHeader.classList.remove(HOME_HEADER_HEIGHT_CLASS);
      lastHeader.style.removeProperty(HOME_HEADER_HEIGHT_VAR);
      lastHeader = null;
      lastHeight = null;
    }

    function outerHeight(element: HTMLElement): number {
      const style = getComputedStyle(element);
      const marginTop = Number.parseFloat(style.marginTop) || 0;
      const marginBottom = Number.parseFloat(style.marginBottom) || 0;

      return element.offsetHeight + marginTop + marginBottom;
    }

    function attachRoot() {
      if (disposed) return;

      const nextRoot = document.querySelector(
        '#main-view',
      ) as HTMLElement | null;
      if (nextRoot === root && root?.isConnected) return;

      contentObserver?.disconnect();
      contentObserver = null;
      cleanupHeader();
      root = nextRoot;

      if (!root) return;

      contentObserver = new MutationObserver(scheduleSync);
      contentObserver.observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }

    function scheduleSync() {
      if (disposed || rafId !== null) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;
        attachRoot();
        sync();
      });
    }

    function sync() {
      if (!root) return;

      const header = root.querySelector(
        '.main-home-homeHeader',
      ) as HTMLElement | null;
      const chips = root.querySelector(
        '.main-home-filterChipsContainer',
      ) as HTMLElement | null;
      const firstSection = root.querySelector(
        'section[data-testid="home-page"]:has(.view-homeShortcutsGrid-shortcuts) .main-home-content section:first-child',
      ) as HTMLElement | null;

      if (!header || !chips || !firstSection) {
        cleanupHeader();
        return;
      }

      const height = outerHeight(chips) + outerHeight(firstSection);

      if (header !== lastHeader) {
        cleanupHeader();
        lastHeader = header;
      }

      if (height === lastHeight) return;

      lastHeight = height;
      header.classList.add(HOME_HEADER_HEIGHT_CLASS);
      header.style.setProperty(HOME_HEADER_HEIGHT_VAR, `${height}px`);
      options?.onHeightChange?.(height, chips, firstSection, header);
    }

    rootObserver = new MutationObserver(scheduleSync);
    rootObserver.observe(document.documentElement, {
      subtree: true,
      childList: true,
    });
    window.addEventListener('resize', scheduleSync);
    scheduleSync();

    return {
      disconnect() {
        disposed = true;
        rootObserver?.disconnect();
        contentObserver?.disconnect();
        window.removeEventListener('resize', scheduleSync);
        rootObserver = null;
        contentObserver = null;

        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }

        cleanupHeader();
        root = null;
      },
    };
  }

  static uiMountWatcher(): SyncController {
    let observer: MutationObserver | null = null;
    let rafId: number | null = null;
    let disposed = false;
    let waitingSince: number | null = null;

    function hasSpotifyShell(): boolean {
      return document.querySelector('.Root__top-container #main-view') !== null;
    }

    function hasSpotifyUi(): boolean {
      return !!(
        document.querySelector('.Root__main-view') ||
        document.querySelector('.main-view-container') ||
        document.querySelector('[data-testid="main-view"]')
      );
    }

    function scheduleCheck() {
      if (disposed || rafId !== null) return;

      rafId = requestAnimationFrame(() => {
        rafId = null;
        check();
      });
    }

    function check() {
      if (!hasSpotifyShell()) {
        waitingSince = null;
        setUiHealth({ status: 'booting', brokenSince: null });
        return;
      }

      if (hasSpotifyUi()) {
        waitingSince = null;
        setUiHealth({ status: 'ready', brokenSince: null });
        return;
      }

      if (waitingSince === null) {
        waitingSince = Date.now();
        Logger.info('Main', 'Waiting for Spotify UI mount...');
      }

      setUiHealth({ status: 'waiting', brokenSince: waitingSince });
    }

    observer = new MutationObserver(scheduleCheck);
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
    });
    scheduleCheck();

    return {
      disconnect() {
        disposed = true;
        observer?.disconnect();
        observer = null;

        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }

        waitingSince = null;
        setUiHealth({ status: 'booting', brokenSince: null });
      },
    };
  }

  static observeCinema(): SyncController {
    let observer: MutationObserver | null = null;

    function cleanupAttributes() {
      const html = document.documentElement;

      html.removeAttribute('data-transition');

      [
        'data-right-sidebar-open-preenter',
        'data-right-sidebar-open-preexit',
        'data-right-sidebar-open-duringexit',
        'data-right-sidebar-open-postexit',
      ].forEach((attribute) => {
        html.removeAttribute(attribute);
      });
    }

    observer = new MutationObserver(cleanupAttributes);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        'data-transition',
        'data-right-sidebar-open-preenter',
        'data-right-sidebar-open-duringenter',
        'data-right-sidebar-open-postenter',
        'data-right-sidebar-open-preexit',
        'data-right-sidebar-open-duringexit',
        'data-right-sidebar-open-postexit',
      ],
    });
    cleanupAttributes();

    return {
      disconnect() {
        observer?.disconnect();
        observer = null;
      },
    };
  }
}
