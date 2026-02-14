import { renderCanvas } from './background';

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
    function check() {
        const current = Spicetify.Player.data?.item;

        if (!current || current.uri !== trackUri) return;

        const container = document.querySelector('.canvasVideoContainerNPV');

        if (!container) {
            requestAnimationFrame(check);
            return;
        }

        const video = container.querySelector(
            'video',
        ) as HTMLVideoElement | null;

        if (
            video &&
            video.videoWidth > 0 &&
            video.readyState >= 2 &&
            !video.paused &&
            video.currentTime > 0
        ) {
            renderCanvas(video);
            return;
        }

        requestAnimationFrame(check);
    }

    check();
}
