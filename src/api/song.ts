import {
  SongEvent,
  SongListener,
  SongPayload,
} from '../types/runtime/song.types';

export class Song {
  private static readonly PLAYER_TIMEOUT_MESSAGE =
    'Spicetify Player not available';
  private static readonly INITIAL_TRACK_SYNC_INTERVAL = 100;

  private static current: Spicetify.PlayerTrack | null = null;
  private static listeners = new Map<SongEvent, Set<SongListener>>();

  private static ready = false;
  private static eventsBound = false;
  private static initPromise: Promise<void> | null = null;
  private static initialTrackTimer: number | null = null;

  private static readyPromise: Promise<void>;
  private static readyResolve: () => void;

  static {
    this.readyPromise = new Promise<void>((resolve) => {
      this.readyResolve = resolve;
    });
  }

  static init(timeout = 15000): Promise<void> {
    if (this.eventsBound) return Promise.resolve();
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.initialize(timeout).finally(() => {
      this.initPromise = null;
    });

    return this.initPromise;
  }

  private static async initialize(timeout: number): Promise<void> {
    await this.waitForPlayer(timeout);
    this.bindEvents();

    if (!this.syncCurrentTrack()) {
      this.startInitialTrackSync(timeout);
    }
  }

  private static waitForPlayer(timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now();

      const check = () => {
        if (
          typeof Spicetify !== 'undefined' &&
          typeof Spicetify.Player?.addEventListener === 'function'
        ) {
          resolve();
          return;
        }

        if (Date.now() - start > timeout) {
          reject(new Error(this.PLAYER_TIMEOUT_MESSAGE));
          return;
        }

        requestAnimationFrame(check);
      };

      check();
    });
  }

  private static bindEvents() {
    if (this.eventsBound) return;

    this.eventsBound = true;
    Spicetify.Player.addEventListener('songchange', (event) => {
      this.handleTrack(
        event?.data?.item ?? Spicetify.Player.data?.item ?? null,
      );
    });
  }

  private static syncCurrentTrack(): boolean {
    const track = Spicetify.Player.data?.item ?? null;
    this.handleTrack(track);
    return track !== null;
  }

  private static startInitialTrackSync(timeout: number) {
    if (this.initialTrackTimer !== null || this.ready) return;

    const deadline = Date.now() + timeout;

    const sync = () => {
      this.initialTrackTimer = null;

      if (this.ready || this.syncCurrentTrack()) return;
      if (Date.now() >= deadline) return;

      this.initialTrackTimer = window.setTimeout(
        sync,
        this.INITIAL_TRACK_SYNC_INTERVAL,
      );
    };

    sync();
  }

  static addEventListener(event: SongEvent, listener: SongListener) {
    this.getListeners(event).add(listener);

    if (!this.eventsBound && !this.initPromise) {
      void this.init().catch((error) => {
        Luminous.Logger.error('Song', 'Initialization retry failed', error);
      });
    }

    if (event === 'ready' && this.ready && this.current) {
      this.callListener(listener, this.createPayload(this.current));
    }

    if (event === 'change' && this.current) {
      this.callListener(listener, this.createPayload(this.current));
    }
  }

  static removeEventListener(event: SongEvent, listener: SongListener) {
    this.listeners.get(event)?.delete(listener);
  }

  static async get(timeout = 15000): Promise<SongPayload | null> {
    const startedAt = Date.now();

    if (!this.eventsBound) {
      try {
        await this.init(timeout);
      } catch {
        return null;
      }
    }

    if (!this.ready) {
      const remaining = Math.max(0, timeout - (Date.now() - startedAt));
      const becameReady = await this.waitForReady(remaining);
      if (!becameReady) return null;
    }

    return this.current ? this.createPayload(this.current) : null;
  }

  private static waitForReady(timeout: number): Promise<boolean> {
    if (this.ready) return Promise.resolve(true);
    if (timeout <= 0) return Promise.resolve(false);

    return new Promise((resolve) => {
      const timeoutId = window.setTimeout(() => resolve(false), timeout);

      void this.readyPromise.then(() => {
        window.clearTimeout(timeoutId);
        resolve(true);
      });
    });
  }

  static getSync(): SongPayload | null {
    return this.current ? this.createPayload(this.current) : null;
  }

  private static handleTrack(track: Spicetify.PlayerTrack | null) {
    if (!track || this.current?.uri === track.uri) return;

    if (this.initialTrackTimer !== null) {
      window.clearTimeout(this.initialTrackTimer);
      this.initialTrackTimer = null;
    }

    this.current = track;

    if (!this.ready) {
      this.ready = true;
      this.readyResolve();
      Luminous.Logger.info('Song', 'Ready, current is', track);
      this.emit('ready');
      return;
    }

    Luminous.Logger.info('Song', 'Changed to', track);
    this.emit('change');
  }

  private static createPayload(track: Spicetify.PlayerTrack): SongPayload {
    const artists = track.artists?.map((artist) => artist.name) ?? [];

    const image =
      track.images?.[0]?.url ??
      track.album?.images?.[0]?.url ??
      track.metadata?.image_url ??
      null;

    return {
      track,
      name: track.name,
      title: artists.length
        ? `${track.name} - ${artists.join(', ')}`
        : track.name,
      artists,
      image,
      uri: track.uri,
    };
  }

  private static emit(event: SongEvent) {
    if (!this.current) return;

    const payload = this.createPayload(this.current);
    this.getListeners(event).forEach((listener) => {
      this.callListener(listener, payload);
    });
  }

  private static callListener(listener: SongListener, payload: SongPayload) {
    try {
      listener(payload);
    } catch (error) {
      Luminous.Logger.error('Song', 'Listener failed', error);
    }
  }

  private static getListeners(event: SongEvent): Set<SongListener> {
    let listeners = this.listeners.get(event);

    if (!listeners) {
      listeners = new Set();
      this.listeners.set(event, listeners);
    }

    return listeners;
  }
}
