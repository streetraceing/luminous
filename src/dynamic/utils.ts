import {
    getCanvasGeneration,
    nextCanvasGeneration,
    renderCanvas,
} from './background';

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

export function waitForCanvasMetadata(trackUri: string) {
    function check() {
        const current = Spicetify.Player.data.item;
        if (!current || current.uri !== trackUri) return;

        const canvasUri = current.metadata?.['canvas.canvasUri'];

        if (!canvasUri) {
            requestAnimationFrame(check);
            return;
        }

        waitForCanvasVideo(trackUri);
    }

    check();
}

export function waitForCanvasVideo(trackUri: string) {
    const gen = nextCanvasGeneration();

    function check() {
        if (gen !== getCanvasGeneration()) return;

        const video = document.querySelector(
            '.canvasVideoContainerNPV video',
        ) as HTMLVideoElement | null;

        if (!video) {
            requestAnimationFrame(check);
            return;
        }

        const current = Spicetify.Player.data?.item;
        if (!current || current.uri !== trackUri) {
            requestAnimationFrame(check);
            return;
        }

        video.addEventListener(
            'playing',
            () => {
                if (gen !== getCanvasGeneration()) return;
                renderCanvas(video, gen);
            },
            { once: true },
        );
    }

    check();
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
            'aside[aria-label="Now playing view"]',
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
