type DomPulseListener = () => void;
type DomPulseFilter = (records: readonly MutationRecord[]) => boolean;

type DomPulseSubscription = {
  listener: DomPulseListener;
  filter?: DomPulseFilter;
};

type DomPulseStats = {
  mutationBatches: number;
  observedRecords: number;
  ignoredMainViewRecords: number;
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
 * One structural observer shared by features that only need to know that the
 * Spotify tree changed. Attribute churn is intentionally excluded: ad blockers
 * and Spotify update class/style attributes very frequently, and listening to
 * those changes globally makes every consumer wake up unnecessarily.
 *
 * #main-view mutations are handled by MainViewPulse and are filtered here so
 * one ad-block mutation does not travel through both synchronization paths.
 */
export class DomPulse {
  private static subscriptions = new Set<DomPulseSubscription>();
  private static observer: MutationObserver | null = null;
  private static frameId: number | null = null;
  private static timerId: number | null = null;
  private static lastDispatchAt = 0;
  private static lastFullSyncAt = 0;
  private static pendingRecords: MutationRecord[] = [];
  private static saturated = false;
  private static forceDispatch = false;
  private static stats: DomPulseStats = {
    mutationBatches: 0,
    observedRecords: 0,
    ignoredMainViewRecords: 0,
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

    this.observeDocument();
    this.lastDispatchAt = 0;
    this.forceDispatch = true;
    this.schedule();
  };

  static subscribe(
    listener: DomPulseListener,
    options: { immediate?: boolean; filter?: DomPulseFilter } = {},
  ): () => void {
    const subscription: DomPulseSubscription = {
      listener,
      filter: options.filter,
    };

    this.subscriptions.add(subscription);
    this.ensureObserver();

    if (options.immediate !== false) this.callListener(listener);

    return () => {
      this.subscriptions.delete(subscription);
      if (this.subscriptions.size === 0) this.stopObserver();
    };
  }

  static getStats(): Readonly<DomPulseStats> {
    return { ...this.stats };
  }

  static destroy(): void {
    this.subscriptions.clear();
    this.stopObserver();
    this.stats = {
      mutationBatches: 0,
      observedRecords: 0,
      ignoredMainViewRecords: 0,
      frames: 0,
      dispatchedListeners: 0,
      saturatedFrames: 0,
      fullSyncFrames: 0,
    };
  }

  private static schedule(): void {
    if (
      document.hidden ||
      this.frameId !== null ||
      this.timerId !== null ||
      this.subscriptions.size === 0
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

  private static ensureObserver(): void {
    if (this.observer) return;

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.observer = new MutationObserver((records) => {
      this.stats.mutationBatches++;
      this.stats.observedRecords += records.length;

      if (document.hidden) {
        this.pendingRecords = [];
        this.saturated = true;
        return;
      }

      const mainView = document.getElementById('main-view');
      let relevantCount = 0;

      for (const record of records) {
        if (mainView?.contains(record.target)) {
          this.stats.ignoredMainViewRecords++;
          continue;
        }

        relevantCount++;
        if (this.saturated) continue;

        if (this.pendingRecords.length >= MAX_PENDING_RECORDS) {
          this.saturated = true;
          continue;
        }

        this.pendingRecords.push(record);
      }

      if (relevantCount > 0) this.schedule();
    });
    this.observeDocument();
  }

  private static observeDocument(): void {
    if (!this.observer || document.hidden) return;
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  private static stopObserver(): void {
    this.observer?.disconnect();
    this.observer = null;
    document.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    );
    this.pendingRecords = [];
    this.saturated = false;
    this.forceDispatch = false;
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

  private static callListener(listener: DomPulseListener): void {
    try {
      listener();
    } catch (error) {
      Luminous.Logger.error('UI', 'DOM pulse listener failed', error);
    }
  }
}

export function mutationTouchesSelector(
  records: readonly MutationRecord[],
  selector: string,
): boolean {
  for (const record of records) {
    const target = record.target;
    if (target instanceof Element && target.closest(selector)) return true;
    if (nodeListTouchesSelector(record.addedNodes, selector)) return true;
    if (nodeListTouchesSelector(record.removedNodes, selector)) return true;
  }

  return false;
}

export function mutationAddsOrRemovesSelector(
  records: readonly MutationRecord[],
  selector: string,
): boolean {
  for (const record of records) {
    if (nodeListTouchesSelector(record.addedNodes, selector)) return true;
    if (nodeListTouchesSelector(record.removedNodes, selector)) return true;
  }

  return false;
}

function nodeListTouchesSelector(nodes: NodeList, selector: string): boolean {
  for (const node of nodes) {
    if (!(node instanceof Element)) continue;
    if (node.matches(selector) || node.querySelector(selector)) return true;
  }

  return false;
}
