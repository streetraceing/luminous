export function getTrackImageUrl(
    item: Spicetify.PlayerTrack | undefined,
): string | null {
    if (!item) return null;

    const fromItem = item.images?.[0]?.url;
    if (fromItem) return fromItem;

    const fromAlbum = item.album?.images?.[0]?.url;
    if (fromAlbum) return fromAlbum;

    return null;
}

export function waitForElement<T extends Element>(
    selector: string,
    generation: number,
): Promise<T | null> {
    return new Promise((resolve) => {
        function check() {
            if (generation !== getGeneration()) {
                resolve(null);
                return;
            }

            const el = document.querySelector(selector) as T | null;

            if (el) {
                resolve(el);
                return;
            }

            requestAnimationFrame(check);
        }

        check();
    });
}

export function getActiveCanvasVideo(): HTMLVideoElement | null {
    const container = document.querySelector('.canvasVideoContainerNPV');

    if (!container) return null;

    const video = container.querySelector('video') as HTMLVideoElement | null;

    if (!video) return null;

    if (video.videoWidth === 0) return null;

    return video;
}

export async function waitForCanvasVideo(gen: number) {
    while (gen === getGeneration()) {
        const container = document.querySelector(
            '.canvasVideoContainerNPV'
        );

        if (container) {
            const video = container.querySelector('video') as HTMLVideoElement | null;

            if (
                video &&
                video.videoWidth > 0 &&
                video.readyState >= 2
            ) {
                return video;
            }
        }

        await new Promise(requestAnimationFrame);
    }

    return null;
}

export function waitForSongInfo(): Promise<void> {
    return new Promise((resolve) => {
        const check = () => {
            if (
                Spicetify.Player &&
                Spicetify.Player.data &&
                Spicetify.Player.data.item
            ) {
                resolve();
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    });
}

export let backgroundGeneration = 0;

export function nextGeneration() {
    backgroundGeneration++;
    return backgroundGeneration;
}

export function getGeneration() {
    return backgroundGeneration;
}
