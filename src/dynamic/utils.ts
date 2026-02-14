export function waitForSongInfo(): Promise<void> {
    return new Promise((resolve) => {
        if (Spicetify.Player?.data?.item) {
            resolve();
            return;
        }

        const handler = () => {
            if (Spicetify.Player?.data?.item) {
                Spicetify.Player.removeEventListener('songchange', handler);
                resolve();
            }
        };

        Spicetify.Player.addEventListener('songchange', handler);
    });
}

export function getTrackImageUrl(
    item: Spicetify.PlayerTrack | undefined,
): string | null {
    if (!item) return null;

    return item.images?.[0]?.url ?? item.album?.images?.[0]?.url ?? null;
}

export function waitForCanvasVideo(
    gen: number,
): Promise<HTMLVideoElement | null> {
    return new Promise((resolve) => {
        if (gen !== getGeneration()) {
            resolve(null);
            return;
        }

        const existing = getActiveCanvasVideo();
        if (existing) {
            resolve(existing);
            return;
        }

        const observer = new MutationObserver(() => {
            if (gen !== getGeneration()) {
                observer.disconnect();
                resolve(null);
                return;
            }

            const video = getActiveCanvasVideo();
            if (video) {
                observer.disconnect();
                resolve(video);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    });
}

export function getActiveCanvasVideo(): HTMLVideoElement | null {
    const container = document.querySelector('.canvasVideoContainerNPV');

    if (!container) return null;

    const video = container.querySelector('video') as HTMLVideoElement | null;
    if (!video) return null;

    if (video.videoWidth === 0 || video.readyState < 2) return null;

    return video;
}

export let backgroundGeneration = 0;

export function nextGeneration() {
    backgroundGeneration++;
    return backgroundGeneration;
}

export function getGeneration() {
    return backgroundGeneration;
}
