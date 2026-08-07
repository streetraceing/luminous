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
  private static currentSignature: string | null = null;
  private static listeners = new Map<SongEvent, Set<SongListener>>();
  private static ready = false;
  private static eventsBound = false;
  private static initPromise: Promise<void> | null = null;
  private static initialTrackTimer: number | null = null;
  private static readyPromise: Promise<void> = Promise.resolve();
  private static readyResolve: () => void = () => undefined;

  private static readonly handleSongChange = (event?: Event) => {
    const playerEvent = event as
      (Event & { data?: Spicetify.PlayerState }) | undefined;
    this.handleTrack(
      playerEvent?.data?.item ?? Spicetify.Player.data?.item ?? null,
    );
  };

  static {
    this.resetReadyPromise();
  }

  static init(timeout = 15000): Promise<void> {
    if (this.eventsBound) return Promise.resolve();
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.initialize(timeout).finally(() => {
      this.initPromise = null;
    });

    return this.initPromise;
  }

  static destroy(): void {
    if (this.eventsBound) {
      try {
        Spicetify.Player.removeEventListener(
          'songchange',
          this.handleSongChange,
        );
      } catch (error) {
        Luminous.Logger.warn('Song', 'Failed to remove player listener', error);
      }
    }

    if (this.initialTrackTimer !== null) {
      window.clearTimeout(this.initialTrackTimer);
      this.initialTrackTimer = null;
    }

    this.listeners.clear();
    this.current = null;
    this.currentSignature = null;
    this.ready = false;
    this.eventsBound = false;
    this.initPromise = null;
    this.resetReadyPromise();
  }

  static addEventListener(event: SongEvent, listener: SongListener): void {
    this.getListeners(event).add(listener);

    if (!this.eventsBound && !this.initPromise) {
      void this.init().catch((error) => {
        Luminous.Logger.error('Song', 'Initialization retry failed', error);
      });
    }

    if (
      this.current &&
      (event === 'change' || (event === 'ready' && this.ready))
    ) {
      this.callListener(listener, this.createPayload(this.current));
    }
  }

  static removeEventListener(event: SongEvent, listener: SongListener): void {
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
      if (!(await this.waitForReady(remaining))) return null;
    }

    return this.current ? this.createPayload(this.current) : null;
  }

  static getSync(): SongPayload | null {
    return this.current ? this.createPayload(this.current) : null;
  }

  private static async initialize(timeout: number): Promise<void> {
    await this.waitForPlayer(timeout);
    this.bindEvents();

    if (!this.syncCurrentTrack()) this.startInitialTrackSync(timeout);
  }

  private static waitForPlayer(timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = performance.now();

      const check = () => {
        if (
          typeof Spicetify !== 'undefined' &&
          typeof Spicetify.Player?.addEventListener === 'function'
        ) {
          resolve();
          return;
        }

        if (performance.now() - start > timeout) {
          reject(new Error(this.PLAYER_TIMEOUT_MESSAGE));
          return;
        }

        requestAnimationFrame(check);
      };

      check();
    });
  }

  private static bindEvents(): void {
    if (this.eventsBound) return;

    this.eventsBound = true;
    Spicetify.Player.addEventListener('songchange', this.handleSongChange);
  }

  private static syncCurrentTrack(): boolean {
    const track = Spicetify.Player.data?.item ?? null;
    this.handleTrack(track);
    return track !== null;
  }

  private static startInitialTrackSync(timeout: number): void {
    if (this.initialTrackTimer !== null || this.ready) return;

    const deadline = Date.now() + timeout;

    const sync = () => {
      this.initialTrackTimer = null;
      if (this.ready || this.syncCurrentTrack() || Date.now() >= deadline)
        return;

      this.initialTrackTimer = window.setTimeout(
        sync,
        this.INITIAL_TRACK_SYNC_INTERVAL,
      );
    };

    sync();
  }

  private static waitForReady(timeout: number): Promise<boolean> {
    if (this.ready) return Promise.resolve(true);
    if (timeout <= 0) return Promise.resolve(false);

    return new Promise((resolve) => {
      let settled = false;
      const finish = (value: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        resolve(value);
      };
      const timeoutId = window.setTimeout(() => finish(false), timeout);
      void this.readyPromise.then(() => finish(true));
    });
  }

  private static handleTrack(track: Spicetify.PlayerTrack | null): void {
    if (!track) return;

    const signature = this.createTrackSignature(track);
    if (
      this.current?.uri === track.uri &&
      this.currentSignature === signature
    ) {
      return;
    }

    if (this.initialTrackTimer !== null) {
      window.clearTimeout(this.initialTrackTimer);
      this.initialTrackTimer = null;
    }

    this.current = track;
    this.currentSignature = signature;

    if (!this.ready) {
      this.ready = true;
      this.readyResolve();
      Luminous.Logger.info('Song', 'Ready', this.createPayload(track));
      this.emit('ready');
      return;
    }

    Luminous.Logger.info('Song', 'Changed', this.createPayload(track));
    this.emit('change');
  }

  private static createTrackSignature(track: Spicetify.PlayerTrack): string {
    const artists = track.artists?.map((artist) => artist.name).join('|') ?? '';
    const image = normalizeImageUrl(
      track.images?.[0]?.url ??
        track.album?.images?.[0]?.url ??
        track.metadata?.image_url ??
        null,
    );

    return `${track.uri}\u0000${track.name}\u0000${artists}\u0000${image ?? ''}`;
  }

  private static createPayload(track: Spicetify.PlayerTrack): SongPayload {
    const artists = track.artists?.map((artist) => artist.name) ?? [];
    const image = normalizeImageUrl(
      track.images?.[0]?.url ??
        track.album?.images?.[0]?.url ??
        track.metadata?.image_url ??
        null,
    );

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

  private static emit(event: SongEvent): void {
    if (!this.current) return;

    const payload = this.createPayload(this.current);
    this.getListeners(event).forEach((listener) => {
      this.callListener(listener, payload);
    });
  }

  private static callListener(
    listener: SongListener,
    payload: SongPayload,
  ): void {
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

  private static resetReadyPromise(): void {
    this.readyPromise = new Promise<void>((resolve) => {
      this.readyResolve = resolve;
    });
  }
}

function normalizeImageUrl(image: string | null | undefined): string | null {
  if (!image) return null;

  const spotifyImagePrefix = 'spotify:image:';
  if (image.startsWith(spotifyImagePrefix)) {
    const imageId = image.slice(spotifyImagePrefix.length);
    return imageId ? `https://i.scdn.co/image/${imageId}` : null;
  }

  return image;
}
