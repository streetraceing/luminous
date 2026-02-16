import { renderImage } from './render/background';
import {
    observeNowPlaying,
    waitForCanvasMetadata,
    waitForSongInfo,
} from './render/utils';

let updateScheduled = false;

function scheduleRefresh() {
    if (updateScheduled) return;
    updateScheduled = true;

    Promise.resolve().then(() => {
        updateScheduled = false;
        refreshBackgroundState();
    });
}

async function refreshBackgroundState() {
    const song = Spicetify.Player.data.item;

    const image = song.images?.[0]?.url ?? song.album?.images?.[0]?.url;
    renderImage(image ?? null);

    waitForCanvasMetadata(song.uri);
    console.log('[Luminous] Background state refreshed for current song');
}

async function init() {
    await waitForSongInfo();

    scheduleRefresh();

    observeNowPlaying({
        onMount: scheduleRefresh,
    });

    Spicetify.Player.addEventListener('songchange', scheduleRefresh);
}

init();
