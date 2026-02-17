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
    return new Promise((resolve, reject) => {
        const gen = nextCanvasGeneration();

        function checkMetadata() {
            if (gen !== getCanvasGeneration()) return;

            const current = Spicetify.Player.data?.item;
            if (!current || current.uri !== trackUri) {
                requestAnimationFrame(checkMetadata);
                return;
            }

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
    onCanvasChange?: (hasCanvas: boolean) => void;
}) {
    let current: HTMLElement | null = null;
    let panelObserver: MutationObserver | null = null;
    let rootObserver: MutationObserver | null = null;
    let lastCanvasState: boolean | null = null;

    function findPanel(): HTMLElement | null {
        const panel = document.querySelector(
            '#Desktop_PanelContainer_Id',
        ) as HTMLElement | null;

        const widget = panel?.querySelector(
            '.main-nowPlayingView-nowPlayingWidget',
        );

        return panel && widget ? panel : null;
    }

    function checkCanvasState(el: HTMLElement) {
        const hasCanvas = !!el.querySelector('.canvasVideoContainerNPV video');

        if (lastCanvasState !== hasCanvas) {
            lastCanvasState = hasCanvas;
            options.onCanvasChange?.(hasCanvas);
        }
    }

    function attach(el: HTMLElement) {
        if (current === el) return;

        current = el;
        options.onMount?.(el);

        checkCanvasState(el);

        panelObserver = new MutationObserver((mutations) => {
            options.onMutation?.(el, mutations);
            checkCanvasState(el);
        });

        panelObserver.observe(el, {
            childList: true,
            subtree: true,
        });
    }

    function detach() {
        if (!current) return;

        panelObserver?.disconnect();
        panelObserver = null;

        current = null;
        lastCanvasState = null;

        options.onUnmount?.();
    }

    function handleRootMutation() {
        const panel = findPanel();

        if (panel && !current) {
            attach(panel);
        }

        if (!panel && current) {
            detach();
        }
    }

    rootObserver = new MutationObserver(handleRootMutation);

    rootObserver.observe(document.body, {
        childList: true,
        subtree: true,
    });

    const playPauseHandler = () => {
        if (Spicetify.Player.isPlaying()) {
            options.onPlay?.();
        } else {
            options.onPause?.();
        }
    };

    Spicetify.Player.addEventListener('onplaypause', playPauseHandler);

    handleRootMutation();

    return {
        disconnect() {
            detach();
            rootObserver?.disconnect();
            rootObserver = null;

            Spicetify.Player.removeEventListener(
                'onplaypause',
                playPauseHandler,
            );
        },
    };
}

export function observePlaylistBackgroundSync(options?: {
    onBackgroundChange?: (
        bg: string,
        source: HTMLElement,
        target: HTMLElement,
    ) => void;
}) {
    const root = document.querySelector('.main-view-container');
    if (!root) return;

    let rafId: number | null = null;
    let lastBg: string | null = null;

    function sync() {
        if (!root) return;

        const source = root.querySelector(
            '.before-scroll-node > div > :first-child',
        ) as HTMLElement | null;

        const target = root.querySelector(
            'section > .main-entityHeader-container, section > div > .main-entityHeader-container',
        ) as HTMLElement | null;

        if (!source || !target) return;

        const bg = getComputedStyle(source).backgroundImage;
        if (!bg || bg === 'none') return;

        if (bg === lastBg) return;
        lastBg = bg;

        target.style.backgroundImage = bg;
        target.style.backgroundSize = 'cover';
        target.style.backgroundPosition = 'center';
        target.style.backgroundRepeat = 'no-repeat';

        options?.onBackgroundChange?.(bg, source, target);
    }

    function scheduleSync() {
        if (rafId !== null) return;

        rafId = requestAnimationFrame(() => {
            rafId = null;
            sync();
        });
    }

    const observer = new MutationObserver(scheduleSync);

    observer.observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
    });

    sync();

    return {
        disconnect() {
            observer.disconnect();
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        },
    };
}
