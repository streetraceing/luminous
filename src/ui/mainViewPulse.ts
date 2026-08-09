import { DomPulse, mutationAddsOrRemovesSelector } from './domPulse';

type MainViewListener = () => void;
type MainViewFilter = (records: readonly MutationRecord[]) => boolean;

type MainViewSubscription = {
  listener: MainViewListener;
  filter?: MainViewFilter;
};

type MainViewPulseStats = {
  mutationBatches: number;
  observedRecords: number;
  frames: number;
  dispatchedListeners: number;
  saturatedFrames: number;
  fullSyncFrames: number;
};

const MAX_PENDING_RECORDS = 64;
const MIN_DISPATCH_INTERVAL_MS = 120;
const SATURATED_DISPATCH_INTERVAL_MS = 220;
const SATURATED_FULL_SYNC_INTERVAL_MS = 750;

/**
 * Shared structural pulse for Spotify's #main-view subtree. Several Luminous
 * features need to react to page mounts, but separate subtree observers make
 * ad-blocker and Spotify DOM churn fan out into duplicate work. This keeps one
 * child-list observer, bounds retained mutation records, and performs a full
 * catch-up only occasionally while the tree is under sustained heavy churn.
 */
export class MainViewPulse {
  private static subscriptions = new Set<MainViewSubscription>();
  private static root: HTMLElement | null = null;
  private static observer: MutationObserver | null = null;
  private static unsubscribeDomPulse: (() => void) | null = null;
  private static frameId: number | null = null;
  private static timerId: number | null = null;
  private static lastDispatchAt = 0;
  private static lastFullSyncAt = 0;
  private static pendingRecords: MutationRecord[] = [];
  private static saturated = false;
  private static forceDispatch = false;
  private static stats: MainViewPulseStats = {
    mutationBatches: 0,
    observedRecords: 0,
    frames: 0,
    dispatchedListeners: 0,
    saturatedFrames: 0,
    fullSyncFrames: 0,
  };

  private static readonly handleVisibilityChange = () => {
    if (document.hidden) {
      this.observer?.disconnect();
      this.pendingRecords = [];
      this.saturated = false;
      this.cancelScheduledDispatch();
      return;
    }

    this.observeRoot();
    this.lastDispatchAt = 0;
    this.forceDispatch = true;
    this.schedule();
  };

  static subscribe(
    listener: MainViewListener,
    options: { immediate?: boolean; filter?: MainViewFilter } = {},
  ): () => void {
    const subscription: MainViewSubscription = {
      listener,
      filter: options.filter,
    };

    this.subscriptions.add(subscription);
    this.ensureStarted();

    if (options.immediate !== false) this.callListener(listener);

    return () => {
      this.subscriptions.delete(subscription);
      if (this.subscriptions.size === 0) this.stop();
    };
  }

  static getRoot(): HTMLElement | null {
    return this.root?.isConnected ? this.root : null;
  }

  static getStats(): Readonly<MainViewPulseStats> {
    return { ...this.stats };
  }

  static destroy(): void {
    this.subscriptions.clear();
    this.stop();
    this.stats = {
      mutationBatches: 0,
      observedRecords: 0,
      frames: 0,
      dispatchedListeners: 0,
      saturatedFrames: 0,
      fullSyncFrames: 0,
    };
  }

  private static ensureStarted(): void {
    if (!this.unsubscribeDomPulse) {
      document.addEventListener(
        'visibilitychange',
        this.handleVisibilityChange,
      );
      this.unsubscribeDomPulse = DomPulse.subscribe(
        () => {
          this.attachRoot();
          this.forceDispatch = true;
          this.schedule();
        },
        {
          immediate: false,
          filter: (records) =>
            mutationAddsOrRemovesSelector(records, '#main-view'),
        },
      );
    }

    this.attachRoot();
  }

  private static attachRoot(): void {
    const nextRoot = document.querySelector('#main-view') as HTMLElement | null;
    if (nextRoot === this.root && this.root?.isConnected) return;

    this.observer?.disconnect();
    this.observer = null;
    this.pendingRecords = [];
    this.saturated = false;
    this.root = nextRoot;

    if (!this.root) return;

    this.observer = new MutationObserver((records) => {
      this.stats.mutationBatches++;
      this.stats.observedRecords += records.length;

      if (document.hidden) {
        this.pendingRecords = [];
        this.saturated = true;
        return;
      }

      for (const record of records) {
        if (this.saturated) continue;

        if (this.pendingRecords.length >= MAX_PENDING_RECORDS) {
          this.saturated = true;
          continue;
        }

        this.pendingRecords.push(record);
      }

      this.schedule();
    });
    this.observeRoot();
  }

  private static observeRoot(): void {
    if (!this.observer || !this.root || document.hidden) return;
    this.observer.observe(this.root, {
      childList: true,
      subtree: true,
    });
  }

  private static schedule(): void {
    if (
      document.hidden ||
      this.subscriptions.size === 0 ||
      this.frameId !== null ||
      this.timerId !== null
    ) {
      return;
    }

    const minInterval = this.saturated
      ? SATURATED_DISPATCH_INTERVAL_MS
      : MIN_DISPATCH_INTERVAL_MS;
    const elapsed = performance.now() - this.lastDispatchAt;
    const delay = Math.max(0, minInterval - elapsed);

    const queueFrame = () => {
      this.timerId = null;
      this.frameId = requestAnimationFrame(() => {
        this.frameId = null;
        const now = performance.now();
        this.lastDispatchAt = now;
        this.attachRoot();

        const records = this.pendingRecords;
        const saturated = this.saturated;
        const fullSync =
          this.forceDispatch ||
          (saturated &&
            now - this.lastFullSyncAt >= SATURATED_FULL_SYNC_INTERVAL_MS);

        this.pendingRecords = [];
        this.saturated = false;
        this.forceDispatch = false;
        this.stats.frames++;
        if (saturated) this.stats.saturatedFrames++;
        if (fullSync) {
          this.stats.fullSyncFrames++;
          this.lastFullSyncAt = now;
        }

        this.subscriptions.forEach(({ listener, filter }) => {
          if (!fullSync && filter && !filter(records)) return;
          this.stats.dispatchedListeners++;
          this.callListener(listener);
        });
      });
    };

    if (delay <= 0) {
      queueFrame();
    } else {
      this.timerId = window.setTimeout(queueFrame, delay);
    }
  }

  private static stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.root = null;
    this.pendingRecords = [];
    this.saturated = false;
    this.forceDispatch = false;

    this.unsubscribeDomPulse?.();
    this.unsubscribeDomPulse = null;
    document.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    );

    this.cancelScheduledDispatch();
    this.lastDispatchAt = 0;
    this.lastFullSyncAt = 0;
  }

  private static cancelScheduledDispatch(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }

    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private static callListener(listener: MainViewListener): void {
    try {
      listener();
    } catch (error) {
      Luminous.Logger.error('UI', 'Main-view pulse listener failed', error);
    }
  }
}
