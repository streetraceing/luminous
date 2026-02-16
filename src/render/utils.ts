export function waitForSongInfo(): Promise<void> {
    return new Promise((resolve) => {
        function check() {
            if (Spicetify?.Player?.data?.item) {
                resolve();
                return;
            }

            requestAnimationFrame(check);
        }

        check();
    });
}

let canvasGeneration = 0;

export function nextCanvasGeneration() {
    canvasGeneration++;
    return canvasGeneration;
}

export function getCanvasGeneration() {
    return canvasGeneration;
}

export function waitForCanvas(
    trackUri: string,
): Promise<{ video: HTMLVideoElement; gen: number }> {
    return new Promise((resolve) => {
        const gen = nextCanvasGeneration();

        function checkMetadata() {
            const current = Spicetify.Player.data?.item;
            if (!current || current.uri !== trackUri) return;

            const canvasUri = current.metadata?.['canvas.canvasUri'];

            if (!canvasUri) {
                requestAnimationFrame(checkMetadata);
                return;
            }

            checkVideo();
        }

        function checkVideo() {
            if (gen !== getCanvasGeneration()) return;

            const video = document.querySelector(
                '.canvasVideoContainerNPV video',
            ) as HTMLVideoElement | null;

            if (!video) {
                requestAnimationFrame(checkVideo);
                return;
            }

            const current = Spicetify.Player.data?.item;
            if (!current || current.uri !== trackUri) {
                requestAnimationFrame(checkVideo);
                return;
            }

            video.addEventListener(
                'playing',
                () => {
                    if (gen !== getCanvasGeneration()) return;
                    resolve({ video, gen });
                },
                { once: true },
            );
        }

        checkMetadata();
    });
}

export function observeNowPlaying(options: {
    onMount?: (el: HTMLElement) => void;
    onMutation?: (el: HTMLElement, mutations: MutationRecord[]) => void;
    onUnmount?: () => void;
    onPlay?: () => void;
    onPause?: () => void;
}) {
    let current: HTMLElement | null = null;
    let observer: MutationObserver | null = null;
    let rafId: number | null = null;

    function attach(el: HTMLElement) {
        if (current === el) return;

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

        if (current) {
            options.onUnmount?.();
        }

        current = null;
    }

    function check() {
        const panel = document.querySelector(
            '#Desktop_PanelContainer_Id',
        ) as HTMLElement | null;

        const widget = panel?.querySelector(
            '.main-nowPlayingView-nowPlayingWidget',
        ) as HTMLElement | null;

        if (!current && panel && widget) {
            attach(panel);
        }

        if (current && (!panel || !widget)) {
            detach();
        }

        rafId = requestAnimationFrame(check);
    }

    const playPauseHandler = () => {
        if (Spicetify.Player.isPlaying()) {
            options.onPlay?.();
        } else {
            options.onPause?.();
        }
    };

    Spicetify.Player.addEventListener('onplaypause', playPauseHandler);

    check();

    return {
        disconnect() {
            detach();

            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }

            Spicetify.Player.removeEventListener(
                'onplaypause',
                playPauseHandler,
            );
        },
    };
}
