import { renderImage } from './dynamic/background';
import {
    observeNowPlaying,
    waitForCanvasMetadata,
    waitForSongInfo,
} from './dynamic/utils';

async function interractWithActiveSong() {
    const song = Spicetify.Player.data.item;

    const image = song.images?.[0]?.url ?? song.album?.images?.[0]?.url;
    renderImage(image ?? null);
    
    waitForCanvasMetadata(song.uri);
}

async function init() {
    await waitForSongInfo();

    interractWithActiveSong();

    observeNowPlaying({
        onMount: interractWithActiveSong,
    });

    Spicetify.Player.addEventListener('songchange', interractWithActiveSong);
}

init();
