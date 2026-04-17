export type SongEvent = "ready" | "change";

export type SongPayload = {
  track: Spicetify.PlayerTrack;
  title: string;
  name: string;
  artists: string[];
  image: string | null;
  uri: string;
};

export type SongListener = (song: SongPayload) => void;

export class Song {
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

      const track = Spicetify.Player.data?.item;
      if (track) {
        this.setCurrent(track);
        this.ready = true;
        this.readyResolve();
        this.emit("ready");
      }

      Luminous.Logger.info("Song", "Initialized, current is", track);

      this.bindEvents();
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
        if (Spicetify?.Player?.data) {
          resolve();
          return;
        }

        if (Date.now() - start > timeout) {
          reject(
            Luminous.Logger.error("Song", "Spicetify Player not available"),
          );
          return;
        }

        requestAnimationFrame(check);
      };

      check();
    });
  }

  private static bindEvents() {
    Spicetify.Player.addEventListener("songchange", () => {
      const track = Spicetify.Player.data?.item;
      if (!track) return;

      if (this.current?.uri === track.uri) return;

      this.setCurrent(track);
      this.emit("change");

      Luminous.Logger.info("Song", "Changed to", track);
    });
  }

  static addEventListener(event: SongEvent, listener: SongListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(listener);

    if (event === "ready" && this.ready && this.current) {
      listener(this.createPayload(this.current));
    }

    if (event === "change" && this.current) {
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
      title: `${track.name} - ${artists.join(", ")}`,
      artists,
      image,
      uri: track.uri,
    };
  }

  private static emit(event: SongEvent) {
    if (!this.current) return;

    const payload = this.createPayload(this.current);
    const listeners = this.listeners.get(event);
    if (!listeners) return;

    for (const listener of listeners) {
      listener(payload);
    }
  }
}
