import {
    attachBlurredImage,
    attachBlurredVideo,
    getCurrentCoverImage,
    setTransparentMode,
} from './dynamic/background';
import { waitForCanvasVideo, waitForSongInfo } from './utils';

async function interractWithActiveSong() {
    const videoPromise = waitForCanvasVideo();
    const imageSrc = getCurrentCoverImage();
    const video = await videoPromise;

    if (video) {
        attachBlurredVideo(video);
        setTransparentMode(true);
        return;
    }

    if (imageSrc) {
        attachBlurredImage(imageSrc);
        setTransparentMode(true);
        return;
    }

    const layer = document.getElementById('luminous-video-bg');
    layer?.remove();

    setTransparentMode(false);
}

async function init() {
    await waitForSongInfo();
    await interractWithActiveSong();

    Spicetify.Player.addEventListener('songchange', async () => {
        document.getElementById('luminous-video-bg')?.remove();
        await interractWithActiveSong();
    });
}

init();
