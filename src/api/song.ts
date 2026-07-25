import {
  SongEvent,
  SongListener,
  SongPayload,
} from '../types/runtime/song.types';

export class Song {
  private static readonly PLAYER_TIMEOUT_MESSAGE =
    'Spicetify Player not available';

  private static current: Spicetify.PlayerTrack | null = null;
  private static listeners = new Map<SongEvent, Set<SongListener>>();

  private static initialized = false;
  private static ready = false;

  private static readyPromise: Promise<void>;
  private static readyResolve: () => void;
  private static readyReject: (reason?: unknown) => void;

  static {
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
  }

  static async init(timeout = 15000) {
    if (this.initialized) return this.readyPromise;

    this.initialized = true;

    try {
      await this.waitForPlayer(timeout);
      this.bindEvents();

      this.handleTrack(Spicetify.Player.data?.item ?? null);
    } catch (e) {
      this.readyReject(e);
      throw e;
    }

    return this.readyPromise;
  }

  private static waitForPlayer(timeout: number) {
    return new Promise<void>((resolve, reject) => {
      const start = Date.now();

      const check = () => {
        if (typeof Spicetify !== 'undefined' && Spicetify.Player?.data) {
          resolve();
          return;
        }

        if (Date.now() - start > timeout) {
          const error = new Error(this.PLAYER_TIMEOUT_MESSAGE);
          Luminous.Logger.error('Song', error.message);
          reject(error);
          return;
        }

        requestAnimationFrame(check);
      };

      check();
    });
  }

  private static bindEvents() {
    Spicetify.Player.addEventListener('songchange', () => {
      this.handleTrack(Spicetify.Player.data?.item ?? null);
    });
  }

  static addEventListener(event: SongEvent, listener: SongListener) {
    this.getListeners(event).add(listener);

    if (event === 'ready' && this.ready && this.current) {
      listener(this.createPayload(this.current));
    }

    if (event === 'change' && this.current) {
      listener(this.createPayload(this.current));
    }
  }

  static removeEventListener(event: SongEvent, listener: SongListener) {
    this.listeners.get(event)?.delete(listener);
  }

  static async get(): Promise<SongPayload | null> {
    if (!this.ready) {
      try {
        await this.readyPromise;
      } catch {
        return null;
      }
    }

    return this.current ? this.createPayload(this.current) : null;
  }

  static getSync(): SongPayload | null {
    return this.current ? this.createPayload(this.current) : null;
  }

  private static setCurrent(track: Spicetify.PlayerTrack) {
    this.current = track;
  }

  private static handleTrack(track: Spicetify.PlayerTrack | null) {
    if (!track || this.current?.uri === track.uri) return;

    this.setCurrent(track);

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
    const artists = track.artists?.map((a) => a.name) ?? [];

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
    for (const listener of this.getListeners(event)) {
      listener(payload);
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
