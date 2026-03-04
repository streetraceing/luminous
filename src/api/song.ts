import { Unstable } from './unstable';

export type SongEvent = 'ready' | 'change';

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
    private static readyPromise: Promise<void>;
    private static readyResolve: () => void;
    private static readyReject: (reason?: unknown) => void;

    static {
        this.readyPromise = new Promise<void>((resolve, reject) => {
            this.readyResolve = resolve;
            this.readyReject = reject;
        });

        Unstable.Events.webpackLoaded.on(() => {
            this.init();
        });
    }

    private static init() {
        if (this.initialized) return;
        this.initialized = true;

        const timeoutMs = 20000;
        const intervalMs = 100;
        const start = Date.now();

        const interval = setInterval(() => {
            const item = Spicetify?.Player?.data?.item;

            if (item) {
                this.setCurrent(item);
                clearInterval(interval);
                this.readyResolve();
                this.emit('ready', item);
                return;
            }

            if (Date.now() - start > timeoutMs) {
                clearInterval(interval);
                this.readyReject(
                    new Error('Player did not initialize in time'),
                );
            }
        }, intervalMs);

        Spicetify.Player.addEventListener('songchange', () => {
            const item = Spicetify.Player.data.item;
            this.setCurrent(item);
            this.emit('change', item);
        });
    }

    static addEventListener(event: SongEvent, listener: SongListener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }

        this.listeners.get(event)!.add(listener);

        if (!this.initialized) {
            Unstable.Events.webpackLoaded.on(() => this.init());
        }
    }

    static removeEventListener(event: SongEvent, listener: SongListener) {
        this.listeners.get(event)?.delete(listener);
    }

    static async get(): Promise<SongPayload | null> {
        if (!this.current) {
            try {
                await this.readyPromise;
            } catch {
                return null;
            }
        }

        return this.getPayload();
    }

    static getSync(): SongPayload | null {
        return this.getPayload();
    }

    private static setCurrent(track: Spicetify.PlayerTrack | null) {
        this.current = track;
    }

    private static getPayload(): SongPayload | null {
        if (!this.current) return null;
        return this.createPayload(this.current);
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
            title: `${track.name} - ${artists.join(', ')}`,
            artists,
            image,
            uri: track.uri,
        };
    }

    private static emit(event: SongEvent, track: Spicetify.PlayerTrack) {
        const payload = this.createPayload(track);

        this.listeners.get(event)?.forEach((listener) => {
            listener(payload);
        });
    }
}
