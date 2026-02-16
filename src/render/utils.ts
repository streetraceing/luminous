function waitUntil(
    condition: () => boolean,
    isValid: () => boolean,
    timeoutMs = 0,
): Promise<boolean> {
    return new Promise((resolve) => {
        let stopped = false;

        if (timeoutMs > 0) {
            setTimeout(() => {
                stopped = true;
                resolve(false);
            }, timeoutMs);
        }

        function check() {
            if (stopped) return;

            if (!isValid()) {
                resolve(false);
                return;
            }

            if (condition()) {
                resolve(true);
                return;
            }

            requestAnimationFrame(check);
        }

        check();
    });
}

export async function waitForSongInfo(): Promise<void> {
    await waitUntil(
        () => !!Spicetify?.Player?.data?.item,
        () => true,
    );
}

export async function waitForCanvasVideo(
    trackUri: string,
): Promise<HTMLVideoElement | null> {
    function isValidTrack() {
        const current = Spicetify.Player.data?.item;
        return !!current && current.uri === trackUri;
    }

    const hasMetadata = await waitUntil(
        () => {
            const current = Spicetify.Player.data?.item;
            return !!current?.metadata?.['canvas.canvasUri'];
        },
        isValidTrack,
        15000,
    );

    if (!hasMetadata) return null;

    const hasVideo = await waitUntil(
        () => !!document.querySelector('.canvasVideoContainerNPV video'),
        isValidTrack,
        15000,
    );

    if (!hasVideo) return null;

    const video = document.querySelector(
        '.canvasVideoContainerNPV video',
    ) as HTMLVideoElement | null;

    if (!video) return null;

    const isPlaying = await new Promise<boolean>((resolve) => {
        if (!isValidTrack()) {
            resolve(false);
            return;
        }

        if (!video.paused) {
            resolve(true);
            return;
        }

        video.addEventListener('playing', () => resolve(true), { once: true });

        setTimeout(() => resolve(false), 15000);
    });

    if (!isPlaying || !isValidTrack()) return null;

    return video;
}

export function observeNowPlaying(options: {
    onMount?: (el: HTMLElement) => void;
    onMutation?: (el: HTMLElement, mutations: MutationRecord[]) => void;
    onUnmount?: () => void;
}) {
    let current: HTMLElement | null = null;
    let observer: MutationObserver | null = null;

    function attach(el: HTMLElement) {
        current = el;
        options.onMount?.(el);

        observer = new MutationObserver((mutations) => {
            options.onMutation?.(el, mutations);
        });

        observer.observe(el, {
            childList: true,
            subtree: true,
            attributes: true,
        });
    }

    function detach() {
        observer?.disconnect();
        observer = null;
        current = null;
        options.onUnmount?.();
    }

    function check() {
        const el = document.querySelector(
            '#Desktop_PanelContainer_Id:has(.main-nowPlayingView-nowPlayingWidget)',
        ) as HTMLElement | null;

        if (!current && el) {
            attach(el);
        }

        if (current && !document.body.contains(current)) {
            detach();
        }

        requestAnimationFrame(check);
    }

    check();

    return {
        disconnect() {
            detach();
        },
    };
}
