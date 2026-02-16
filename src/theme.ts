import { Logger } from './logger';
import {
    getCanvasGeneration,
    nextCanvasGeneration,
    renderCanvas,
    renderImage,
    switchTo,
} from './render/background';
import {
    observeNowPlaying,
    waitForCanvasVideo,
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
    const song = Spicetify.Player.data?.item;
    if (!song) return;

    const gen = nextCanvasGeneration();

    const image = song.images?.[0]?.url ?? song.album?.images?.[0]?.url;

    let imageRendered = false;

    if (image) {
        renderImage(image);
        imageRendered = true;

        Logger.info(
            `Spotify background is set to "${song.name} - ${song.artists?.join(', ')}" using its picture`,
        );
    }

    const video = await waitForCanvasVideo(song.uri);

    if (gen !== getCanvasGeneration()) return;

    if (video) {
        renderCanvas(video, gen);

        Logger.info(
            `Background upgraded to canvas for "${song.name} - ${song.artists?.join(', ')}"`,
        );

        return;
    }

    if (!imageRendered) {
        switchTo('none');

        Logger.warn(
            `Couldn't find background for "${song.name} - ${song.artists?.join(', ')}"`,
        );
    }
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
