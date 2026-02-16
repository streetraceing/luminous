import { renderCanvas, renderImage } from './render/background';
import { observePlaylistBackgroundSync } from './render/page';
import {
    observeNowPlaying,
    waitForCanvas,
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

    const title = `${song.name} - ${song.artists?.map((a) => a.name).join(', ')}`;
    const image = song.images?.[0]?.url ?? song.album?.images?.[0]?.url;

    if (image) {
        renderImage(image);
        console.log(`[Luminous] Image background set for "${title}"`);
    } else {
        renderImage(null);
        console.warn(`[Luminous] No image found for "${title}"`);
    }

    try {
        const canvas = await waitForCanvas(song.uri);

        const current = Spicetify.Player.data?.item;
        if (!current || current.uri !== song.uri) {
            console.log(
                `[Luminous] Canvas cancelled (track changed) for "${title}"`,
            );
            return;
        }

        renderCanvas(canvas.video, canvas.gen);

        console.log(
            `[Luminous] Background set or upgraded to canvas for "${title}"`,
        );
    } catch {
        console.warn(`[Luminous] Canvas not available for "${title}"`);
    }
}

async function init() {
    await waitForSongInfo();

    scheduleRefresh();
    observeNowPlaying({
        onMount: scheduleRefresh,
    });
    Spicetify.Player.addEventListener('songchange', scheduleRefresh);

    observePlaylistBackgroundSync();
}

init();
