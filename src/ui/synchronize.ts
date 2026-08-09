import {
  HomeHeaderHeightSyncOptions,
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
const HOME_HEADER_HEIGHT_CLASS = 'luminous-home-header-height';
const HOME_HEADER_HEIGHT_VAR = '--luminous-home-header-height';

const PLAYLIST_STRUCTURE_SELECTOR = [
  '.main-view-container',
  '.before-scroll-node',
  '.main-entityHeader-container',
  '.playlist-playlist-page',
  '.main-trackList-trackListContainer',
].join(',');

const HOME_STRUCTURE_SELECTOR = [
  '.main-home-homeHeader',
  '.main-home-filterChipsContainer',
  '.view-homeShortcutsGrid-shortcuts',
  '.main-home-content',
  'section[data-testid="home-page"]',
].join(',');

const MAIN_VIEW_STATE_SELECTOR = [
  '.playlist-playlist-page',
  '.main-trackList-trackListContainer',
  '.marketplace-content',
  '#searchPage',
  'section[data-testid="episode"]',
  'section[data-test-uri^="spotify:artist:"]',
  '.main-home-filterChipsContainer',
  '.view-homeShortcutsGrid-shortcuts',
  '.main-shelf-shelf',
  'div[data-testid="test-ref-div"]',
  '.main-entityHeader-image',
  '.main-actionBarBackground-background',
  '.playlist-playlist-actionBarBackground-background',
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

      const target =
        (root.querySelector(
          'section > .main-entityHeader-container, section > div > .main-entityHeader-container',
        ) as HTMLElement | null) ||
        (root.querySelector(
          'main > div > .main-entityHeader-container',
        ) as HTMLElement | null);

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

  static homeHeaderHeight(
    options?: HomeHeaderHeightSyncOptions,
  ): SyncController {
    let root: HTMLElement | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let rafId: number | null = null;
    let disposed = false;
    let lastHeight: number | null = null;
    let lastHeader: HTMLElement | null = null;
    let lastChips: HTMLElement | null = null;
    let lastSection: HTMLElement | null = null;

    function cleanupHeader() {
      if (lastHeader) {
        lastHeader.classList.remove(HOME_HEADER_HEIGHT_CLASS);
        lastHeader.style.removeProperty(HOME_HEADER_HEIGHT_VAR);
      }

      lastHeader = null;
      lastHeight = null;
    }

    function clearMeasuredElements() {
      resizeObserver?.disconnect();
      resizeObserver = null;
      lastChips = null;
      lastSection = null;
    }

    function outerHeight(element: HTMLElement): number {
      const style = getComputedStyle(element);
      const marginTop = Number.parseFloat(style.marginTop) || 0;
      const marginBottom = Number.parseFloat(style.marginBottom) || 0;

      return element.getBoundingClientRect().height + marginTop + marginBottom;
    }

    function observeMeasuredElements(chips: HTMLElement, section: HTMLElement) {
      if (chips === lastChips && section === lastSection) return;

      clearMeasuredElements();
      lastChips = chips;
      lastSection = section;

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(scheduleSync);
        resizeObserver.observe(chips);
        resizeObserver.observe(section);
      }
    }

    function attachRoot() {
      if (disposed) return;

      const nextRoot = MainViewPulse.getRoot();
      if (nextRoot === root && root?.isConnected) return;

      clearMeasuredElements();
      cleanupHeader();
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

      const header = root.querySelector(
        '.main-home-homeHeader',
      ) as HTMLElement | null;
      const chips = root.querySelector(
        '.main-home-filterChipsContainer',
      ) as HTMLElement | null;
      const homePage = root.querySelector(
        'section[data-testid="home-page"]',
      ) as HTMLElement | null;
      const hasShortcuts = !!homePage?.querySelector(
        '.view-homeShortcutsGrid-shortcuts',
      );
      const firstSection = hasShortcuts
        ? (homePage?.querySelector(
            '.main-home-content section:first-child',
          ) as HTMLElement | null)
        : null;

      if (!header || !chips || !firstSection) {
        clearMeasuredElements();
        cleanupHeader();
        return;
      }

      observeMeasuredElements(chips, firstSection);
      const height = outerHeight(chips) + outerHeight(firstSection);

      if (header !== lastHeader) {
        cleanupHeader();
        lastHeader = header;
      }

      if (Math.abs(height - (lastHeight ?? -1)) < 0.5) return;

      lastHeight = height;
      header.classList.add(HOME_HEADER_HEIGHT_CLASS);
      header.style.setProperty(HOME_HEADER_HEIGHT_VAR, `${height}px`);
      options?.onHeightChange?.(height, chips, firstSection, header);
    }

    const unsubscribeMainViewPulse = MainViewPulse.subscribe(scheduleSync, {
      filter: (records) =>
        mutationTouchesSelector(records, HOME_STRUCTURE_SELECTOR),
    });
    window.addEventListener('resize', scheduleSync, { passive: true });

    return {
      disconnect() {
        disposed = true;
        unsubscribeMainViewPulse();
        resizeObserver?.disconnect();
        window.removeEventListener('resize', scheduleSync);
        resizeObserver = null;

        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }

        clearMeasuredElements();
        cleanupHeader();
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
      'luminous-page-home-shortcuts',
      'luminous-page-shelf',
    ] as const;

    let root: HTMLElement | null = null;
    let disposed = false;
    let hiddenTestRefContainers = new Set<HTMLElement>();
    let artistImageAncestors = new Set<HTMLElement>();
    let actionBarBackgroundParents = new Set<HTMLElement>();

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
      actionBarBackgroundParents = clearMarkedElements(
        actionBarBackgroundParents,
        'luminous-actionbar-background-parent',
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
          '.playlist-playlist-page, .main-trackList-trackListContainer',
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
        !!root.querySelector('.main-home-filterChipsContainer'),
      );
      toggle(
        'luminous-page-home-shortcuts',
        !!root.querySelector(
          'section[data-testid="home-page"] .view-homeShortcutsGrid-shortcuts',
        ),
      );
      toggle('luminous-page-shelf', !!root.querySelector('.main-shelf-shelf'));

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
      const artistImage = root.querySelector('.main-entityHeader-image');
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

      const nextActionBarParents = new Set<HTMLElement>();
      root
        .querySelectorAll<HTMLElement>(
          '.main-actionBarBackground-background, .playlist-playlist-actionBarBackground-background',
        )
        .forEach((background) => {
          let candidate = background.parentElement;
          while (candidate && candidate !== root) {
            const wrapper = candidate.parentElement;
            const section = wrapper?.parentElement;
            const main = section?.parentElement;
            const scrollChild = main?.parentElement;

            if (
              candidate.tagName === 'DIV' &&
              wrapper?.tagName === 'DIV' &&
              section?.tagName === 'SECTION' &&
              main?.tagName === 'MAIN' &&
              scrollChild?.classList.contains(
                'main-view-container__scroll-node-child',
              )
            ) {
              candidate.classList.add('luminous-actionbar-background-parent');
              nextActionBarParents.add(candidate);
              break;
            }

            candidate = candidate.parentElement;
          }
        });
      actionBarBackgroundParents.forEach((element) => {
        if (!nextActionBarParents.has(element)) {
          element.classList.remove('luminous-actionbar-background-parent');
        }
      });
      actionBarBackgroundParents = nextActionBarParents;
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

      const expanded =
        !!sidebar && sidebar.getAttribute('class') !== 'Root__nav-bar';
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
        document.querySelector('.Root__main-view') ||
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
          '.Root__main-view,.main-view-container,[data-testid="main-view"]',
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
    let markedBranches = new Set<HTMLElement>();

    function clearCinemaMarkers() {
      cinemaRoot?.classList.remove('luminous-cinema-has-video');
      markedBranches.forEach((branch) =>
        branch.classList.remove(
          'luminous-cinema-video-branch',
          'luminous-cinema-content-branch',
        ),
      );
      markedBranches = new Set();
      cinemaRoot = null;
    }

    function syncCinemaMarkers() {
      const nextRoot = document.querySelector(
        '.Root__cinema-view',
      ) as HTMLElement | null;

      if (nextRoot !== cinemaRoot) clearCinemaMarkers();
      cinemaRoot = nextRoot;
      if (!cinemaRoot) return;

      cinemaRoot.classList.toggle(
        'luminous-cinema-has-video',
        cinemaRoot.querySelector('video') !== null,
      );

      const nextMarkedBranches = new Set<HTMLElement>();
      const contentRoots = cinemaRoot.querySelectorAll<HTMLElement>(
        '.main-actionBar-ActionBarContainer > div:not(.os-scrollbar)',
      );

      contentRoots.forEach((contentRoot) => {
        for (const child of contentRoot.children) {
          if (!(child instanceof HTMLElement)) continue;

          const hasVideoPortal =
            child.querySelector('#VideoPlayerCinema_ReactPortal') !== null;
          child.classList.toggle(
            'luminous-cinema-video-branch',
            hasVideoPortal,
          );
          child.classList.toggle(
            'luminous-cinema-content-branch',
            !hasVideoPortal,
          );
          nextMarkedBranches.add(child);
        }
      });

      markedBranches.forEach((branch) => {
        if (nextMarkedBranches.has(branch)) return;
        branch.classList.remove(
          'luminous-cinema-video-branch',
          'luminous-cinema-content-branch',
        );
      });
      markedBranches = nextMarkedBranches;
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
        mutationTouchesSelector(
          records,
          '.Root__cinema-view,#VideoPlayerCinema_ReactPortal',
        ),
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
