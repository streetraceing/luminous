import { renderBackground, setTransparentMode } from './dynamic/background';
import {
    getActiveCanvasVideo,
    getGeneration,
    getTrackImageUrl,
    nextGeneration,
    waitForCanvasVideo,
    waitForSongInfo,
} from './dynamic/utils';

async function interractWithActiveSong() {
    const gen = nextGeneration();

    const item = Spicetify.Player.data?.item;
    if (!item) return;

    const imageUrl = getTrackImageUrl(item);

    if (imageUrl) {
        renderBackground({ type: 'image', src: imageUrl });
    } else {
        renderBackground({ type: 'none' });
    }

    const existing = getActiveCanvasVideo();
    if (existing) {
        renderBackground({ type: 'video', video: existing });
        return;
    }

    const video = await waitForCanvasVideo(gen);

    if (gen !== getGeneration()) return;

    if (video) {
        renderBackground({ type: 'video', video });
    }
}

async function init() {
    await waitForSongInfo();

    interractWithActiveSong();

    Spicetify.Player.addEventListener('songchange', () => {
        interractWithActiveSong();
    });
}

init();
