import { renderBackground, setTransparentMode } from './dynamic/background';
import {
    getGeneration,
    getTrackImageUrl,
    nextGeneration,
    waitForCanvasVideo,
    waitForSongInfo
} from './dynamic/utils';

async function interractWithActiveSong() {
    const gen = nextGeneration();

    const item = Spicetify.Player.data?.item;
    if (!item) return;

    const imageUrl = getTrackImageUrl(item);

    if (imageUrl) {
        renderBackground({ type: 'image', src: imageUrl });
        setTransparentMode(true);
    } else {
        renderBackground({ type: 'none' });
        setTransparentMode(false);
    }

    const video = await waitForCanvasVideo(gen);

    if (gen !== getGeneration()) return;

    if (video) {
        renderBackground({ type: 'video', video });
        setTransparentMode(true);
    }
}

async function init() {
    await waitForSongInfo();
    await interractWithActiveSong();

    Spicetify.Player.addEventListener('songchange', interractWithActiveSong);
}

init();
