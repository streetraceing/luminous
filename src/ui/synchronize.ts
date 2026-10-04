import {
  PlaylistBackgroundSyncOptions,
  SyncController,
} from '../types/runtime/dynamic.types';
import { Logger } from '../api/logger';
import { setUiHealth } from './health';
import {
  DomPulse,
  mutationAddsOrRemovesSelector,
  mutationTouchesSelector,
} from './domPulse';
import { MainViewPulse } from './mainViewPulse';

const PLAYLIST_BACKGROUND_CLASS = 'luminous-playlist-background';
const PLAYLIST_BACKGROUND_VAR = '--luminous-playlist-background-image';

const PLAYLIST_STRUCTURE_SELECTOR = [
  '.main-view-container',
  '.before-scroll-node',
  '[data-testid="playlist-page"]',
  '[data-testid="playlist-tracklist"]',
  '[data-testid="entity-header"]',
].join(',');

const MAIN_VIEW_STATE_SELECTOR = [
  '[data-testid="playlist-page"]',
  '[data-testid="playlist-tracklist"]',
  '.marketplace-content',
  '#searchPage',
  'section[data-testid="episode"]',
  'section[data-test-uri^="spotify:artist:"]',
  'section[data-testid="home-page"]',
  'div[data-testid="test-ref-div"]',
  '[data-testid="entity-header"]',
].join(',');

export class Synchronize {
  static playlistBackground(
    options?: PlaylistBackgroundSyncOptions,
  ): SyncController {
    let root: HTMLElement | null = null;
    let sourceObserver: MutationObserver | null = null;
    let observedSource: HTMLElement | null = null;
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

    function observeSource(source: HTMLElement | null) {
      if (source === observedSource) return;

      sourceObserver?.disconnect();
      sourceObserver = null;
      observedSource = source;

      if (!source) return;

      sourceObserver = new MutationObserver(scheduleSync);
      sourceObserver.observe(source, {
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }

    function attachRoot() {
      if (disposed) return;

      const mainView = MainViewPulse.getRoot();
      const nextRoot = (mainView?.querySelector('.main-view-container') ??
        document.querySelector('.main-view-container')) as HTMLElement | null;

      if (nextRoot === root && root?.isConnected) return;

      observeSource(null);
      cleanupTarget();
      root = nextRoot;
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

      const target = root.querySelector(
        '[data-testid="entity-header"]',
      ) as HTMLElement | null;

      observeSource(source);

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

    const unsubscribeMainViewPulse = MainViewPulse.subscribe(scheduleSync, {
      filter: (records) =>
        mutationTouchesSelector(records, PLAYLIST_STRUCTURE_SELECTOR),
    });

    return {
      disconnect() {
        disposed = true;
        unsubscribeMainViewPulse();
        sourceObserver?.disconnect();
        sourceObserver = null;
        observedSource = null;

        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }

        cleanupTarget();
        root = null;
      },
    };
  }

  static mainViewState(): SyncController {
    const stateClasses = [
      'luminous-page-playlist',
      'luminous-page-marketplace',
      'luminous-page-search',
      'luminous-page-episode',
      'luminous-page-artist',
      'luminous-page-home',
    ] as const;

    let root: HTMLElement | null = null;
    let disposed = false;
    let hiddenTestRefContainers = new Set<HTMLElement>();
    let artistImageAncestors = new Set<HTMLElement>();

    function clearMarkedElements(
      elements: Set<HTMLElement>,
      className: string,
    ): Set<HTMLElement> {
      elements.forEach((element) => element.classList.remove(className));
      return new Set();
    }

    function cleanupRoot() {
      root?.classList.remove(...stateClasses);
      hiddenTestRefContainers = clearMarkedElements(
        hiddenTestRefContainers,
        'luminous-hidden-test-ref-container',
      );
      artistImageAncestors = clearMarkedElements(
        artistImageAncestors,
        'luminous-artist-image-ancestor',
      );
    }

    function attachRoot() {
      const nextRoot = MainViewPulse.getRoot();
      if (nextRoot === root && root?.isConnected) return;

      cleanupRoot();
      root = nextRoot;
    }

    function toggle(className: (typeof stateClasses)[number], value: boolean) {
      root?.classList.toggle(className, value);
    }

    function sync() {
      if (disposed) return;
      attachRoot();
      if (!root) return;

      toggle(
        'luminous-page-playlist',
        !!root.querySelector(
          '[data-testid="playlist-page"], [data-testid="playlist-tracklist"]',
        ),
      );
      toggle(
        'luminous-page-marketplace',
        !!root.querySelector('.marketplace-content'),
      );
      toggle('luminous-page-search', !!root.querySelector('#searchPage'));
      toggle(
        'luminous-page-episode',
        !!root.querySelector('section[data-testid="episode"]'),
      );
      toggle(
        'luminous-page-artist',
        !!root.querySelector('section[data-test-uri^="spotify:artist:"]'),
      );
      toggle(
        'luminous-page-home',
        !!root.querySelector('section[data-testid="home-page"]'),
      );

      const nextHiddenTestRefs = new Set<HTMLElement>();
      root
        .querySelectorAll<HTMLElement>('div[data-testid="test-ref-div"]')
        .forEach((testRef) => {
          let container = testRef.parentElement;
          while (container?.parentElement && container.parentElement !== root) {
            container = container.parentElement;
          }

          if (container?.parentElement === root) {
            container.classList.add('luminous-hidden-test-ref-container');
            nextHiddenTestRefs.add(container);
          }
        });

      hiddenTestRefContainers.forEach((element) => {
        if (!nextHiddenTestRefs.has(element)) {
          element.classList.remove('luminous-hidden-test-ref-container');
        }
      });
      hiddenTestRefContainers = nextHiddenTestRefs;

      const nextArtistImageAncestors = new Set<HTMLElement>();
      const artistImage = root.querySelector(
        'section[data-test-uri^="spotify:artist:"] [data-testid="entity-header"] img, section[data-test-uri^="spotify:artist:"] img',
      );
      let artistAncestor = artistImage?.parentElement ?? null;
      while (artistAncestor && artistAncestor !== root) {
        if (artistAncestor.tagName === 'DIV') {
          artistAncestor.classList.add('luminous-artist-image-ancestor');
          nextArtistImageAncestors.add(artistAncestor);
        }
        artistAncestor = artistAncestor.parentElement;
      }
      artistImageAncestors.forEach((element) => {
        if (!nextArtistImageAncestors.has(element)) {
          element.classList.remove('luminous-artist-image-ancestor');
        }
      });
      artistImageAncestors = nextArtistImageAncestors;
    }

    const unsubscribeMainViewPulse = MainViewPulse.subscribe(sync, {
      filter: (records) =>
        mutationTouchesSelector(records, MAIN_VIEW_STATE_SELECTOR),
    });

    return {
      disconnect() {
        disposed = true;
        unsubscribeMainViewPulse();
        cleanupRoot();
        root = null;
      },
    };
  }

  static leftSidebarState(): SyncController {
    let sidebar: HTMLElement | null = null;
    let observer: MutationObserver | null = null;
    let disposed = false;

    function cleanup() {
      observer?.disconnect();
      observer = null;
      document.documentElement.classList.remove(
        'luminous-left-sidebar-expanded',
      );
    }

    function sync() {
      if (disposed) return;

      const nextSidebar = document.querySelector(
        '#Desktop_LeftSidebar_Id',
      ) as HTMLElement | null;

      if (nextSidebar !== sidebar) {
        observer?.disconnect();
        observer = null;
        sidebar = nextSidebar;

        if (sidebar) {
          observer = new MutationObserver(sync);
          observer.observe(sidebar, {
            attributes: true,
            attributeFilter: ['class'],
          });
        }
      }

      // Spotify 1.3.x no longer exposes Root__nav-bar; the collapsed/expanded
      // states are hashed CSS-module classes. Width is the only stable signal:
      // the collapsed sidebar is an icon rail around 72-80px wide.
      const expanded = !!sidebar && sidebar.getBoundingClientRect().width > 120;
      document.documentElement.classList.toggle(
        'luminous-left-sidebar-expanded',
        expanded,
      );
    }

    const unsubscribeDomPulse = DomPulse.subscribe(sync, {
      filter: (records) =>
        mutationAddsOrRemovesSelector(records, '#Desktop_LeftSidebar_Id'),
    });

    return {
      disconnect() {
        disposed = true;
        unsubscribeDomPulse();
        cleanup();
        sidebar = null;
      },
    };
  }

  static uiMountWatcher(): SyncController {
    let disposed = false;
    let waitingSince: number | null = null;

    function hasSpotifyShell(): boolean {
      return document.querySelector('.Root__top-container #main-view') !== null;
    }

    function hasSpotifyUi(): boolean {
      return !!(
        document.querySelector('.main-view-container') ||
        document.querySelector('[data-testid="main-view"]')
      );
    }

    function check() {
      if (disposed) return;

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

    const unsubscribeDomPulse = DomPulse.subscribe(check, {
      filter: (records) =>
        mutationAddsOrRemovesSelector(
          records,
          '.Root__top-container,#main-view',
        ),
    });
    const unsubscribeMainViewPulse = MainViewPulse.subscribe(check, {
      immediate: false,
      filter: (records) =>
        mutationAddsOrRemovesSelector(
          records,
          '.main-view-container,[data-testid="main-view"]',
        ),
    });

    return {
      disconnect() {
        disposed = true;
        unsubscribeDomPulse();
        unsubscribeMainViewPulse();
        waitingSince = null;
        setUiHealth({ status: 'booting', brokenSince: null });
      },
    };
  }

  static observeCinema(): SyncController {
    let observer: MutationObserver | null = null;
    let scheduled = false;
    let cinemaRoot: HTMLElement | null = null;

    function clearCinemaMarkers() {
      cinemaRoot?.classList.remove('luminous-cinema-has-video');
      cinemaRoot = null;
    }

    function hasCinemaVideo(): boolean {
      if (cinemaRoot?.querySelector('video')) return true;

      // Spotify 1.3.x renders the cinema-mode video in a hashed overlay that
      // is a direct child of the top container, outside the main view and the
      // right panel. Any other video there is the cinema video.
      for (const video of document.querySelectorAll('video')) {
        if (
          !video.closest('.Root__top-container') ||
          video.closest('#main-view') ||
          video.closest('#Desktop_PanelContainer_Id') ||
          video.closest('.canvasVideoContainerNPV') ||
          video.closest('.main-nowPlayingBar-container')
        ) {
          continue;
        }

        if (video.getClientRects().length > 0) return true;
      }

      return false;
    }

    function syncCinemaMarkers() {
      const nextRoot = document.querySelector(
        '#lyrics-cinema',
      ) as HTMLElement | null;

      if (nextRoot !== cinemaRoot) clearCinemaMarkers();
      cinemaRoot = nextRoot;
      if (!cinemaRoot) return;

      cinemaRoot.classList.toggle(
        'luminous-cinema-has-video',
        hasCinemaVideo(),
      );
    }

    function cleanupAttributes() {
      scheduled = false;
      const html = document.documentElement;

      if (html.hasAttribute('data-transition')) {
        html.removeAttribute('data-transition');
      }

      [
        'data-right-sidebar-open-preenter',
        'data-right-sidebar-open-preexit',
        'data-right-sidebar-open-duringexit',
        'data-right-sidebar-open-postexit',
      ].forEach((attribute) => {
        if (html.hasAttribute(attribute)) html.removeAttribute(attribute);
      });
    }

    function scheduleCleanup() {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(cleanupAttributes);
    }

    observer = new MutationObserver(scheduleCleanup);
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
    syncCinemaMarkers();

    const unsubscribeDomPulse = DomPulse.subscribe(syncCinemaMarkers, {
      immediate: false,
      filter: (records) =>
        mutationTouchesSelector(records, '#lyrics-cinema,video'),
    });

    return {
      disconnect() {
        observer?.disconnect();
        observer = null;
        unsubscribeDomPulse();
        clearCinemaMarkers();
        scheduled = false;
      },
    };
  }
}
