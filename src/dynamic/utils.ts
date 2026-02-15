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
