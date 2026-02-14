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
        const video = document.querySelector(
            '.canvasVideoContainerNPV video'
        ) as HTMLVideoElement | null;

        if (
            video &&
            video.currentSrc &&
            video.readyState >= 3
        ) {
            const current = Spicetify.Player.data?.item;

            if (current && current.uri === trackUri) {
                console.log(video)
                setTimeout(() => {
                    renderCanvas(video);
                }, 500);
            }

            return;
        }

        requestAnimationFrame(check);
    }

    check();
}
